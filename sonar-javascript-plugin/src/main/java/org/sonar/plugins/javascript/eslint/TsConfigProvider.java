/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.eslint;

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import javax.annotation.Nullable;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonarsource.analyzer.commons.FileProvider;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static java.util.stream.Collectors.toList;

class TsConfigProvider {

  private static final Logger LOG = Loggers.get(TsConfigProvider.class);

  interface Provider {
    List<String> tsconfigs(SensorContext context) throws IOException;
  }

  @FunctionalInterface
  interface TsConfigFileCreator {
    String createTsConfigFile(String content) throws IOException;
  }

  private final List<Provider> providers;

  /**
   * Relying on (in order of priority)
   * 1. Property sonar.typescript.tsconfigPath(s)
   * 2. Looking up file system
   * 3. Creating a tmp tsconfig.json listing all files
   */
  TsConfigProvider(TempFolder folder) {
    providers = Arrays.asList(
      new PropertyTsConfigProvider(),
      new LookupTsConfigProvider(),
      new DefaultTsConfigProvider(folder, JavaScriptFilePredicate::getTypeScriptPredicate));
  }

  /**
   * Relying on (in order of priority)
   * 1. Property sonar.typescript.tsconfigPath(s)
   * 2. Looking up file system
   */
  TsConfigProvider() {
    providers = List.of(new PropertyTsConfigProvider(), new LookupTsConfigProvider());
  }

  List<String> tsconfigs(SensorContext context) throws IOException {
    for (Provider provider : providers) {
      List<String> tsconfigs = provider.tsconfigs(context);
      if (!tsconfigs.isEmpty()) {
        return tsconfigs;
      }
    }
    return emptyList();
  }

  static class PropertyTsConfigProvider implements Provider {

    @Override
    public List<String> tsconfigs(SensorContext context) {
      if (!context.config().hasKey(JavaScriptPlugin.TSCONFIG_PATHS) && !context.config().hasKey(JavaScriptPlugin.TSCONFIG_PATHS_ALIAS)) {
        return emptyList();
      }

      String property = context.config().hasKey(JavaScriptPlugin.TSCONFIG_PATHS) ? JavaScriptPlugin.TSCONFIG_PATHS : JavaScriptPlugin.TSCONFIG_PATHS_ALIAS;
      Set<String> patterns = new HashSet<>(Arrays.asList(context.config().getStringArray(property)));

      LOG.info("Resolving TSConfig files using '{}' from property {}", String.join(",", patterns), property);

      File baseDir = context.fileSystem().baseDir();

      List<String> tsconfigs = new ArrayList<>();
      for (String pattern : patterns) {
        LOG.debug("Using '{}' to resolve TSConfig file(s)", pattern);

        /** Resolving a TSConfig file based on a path */
        Path tsconfig = getFilePath(baseDir, pattern);
        if (tsconfig != null) {
          tsconfigs.add(tsconfig.toString());
          continue;
        }

        /** Resolving TSConfig files based on pattern matching */
        FileProvider fileProvider = new FileProvider(baseDir, pattern);
        List<File> matchingTsconfigs = fileProvider.getMatchingFiles();
        if (!matchingTsconfigs.isEmpty()) {
          tsconfigs.addAll(matchingTsconfigs.stream().map(File::getAbsolutePath).collect(toList()));
        }
      }

      LOG.info("Found " + tsconfigs.size() + " TSConfig file(s): " + tsconfigs);

      return tsconfigs;
    }

    private static Path getFilePath(File baseDir, String path) {
      File file = new File(path);
      if (!file.isAbsolute()) {
        file = new File(baseDir, path);
      }

      if (!file.isFile()) {
        return null;
      }

      return file.toPath();
    }
  }

  static class LookupTsConfigProvider implements Provider {

    @Override
    public List<String> tsconfigs(SensorContext context) {
      var fs = context.fileSystem();
      var tsconfigs = new ArrayList<String>();
      var dirs = new ArrayDeque<File>();
      dirs.add(fs.baseDir());
      while (!dirs.isEmpty()) {
        var dir = dirs.removeFirst();
        var files = dir.listFiles();
        if (files == null) {
          continue;
        }
        for (var file : files) {
          if (file.isDirectory() && !"node_modules".equals(file.getName())) {
            dirs.add(file);
          } else if ("tsconfig.json".equals(file.getName())) {
            tsconfigs.add(file.getAbsolutePath());
          }
        }
      }
      LOG.info("Found " + tsconfigs.size() + " tsconfig.json file(s): " + tsconfigs);
      return tsconfigs;
    }
  }

  abstract static class GeneratedTsConfigFileProvider implements Provider {

    static class TsConfig {
      List<String> files;
      Map<String, Object> compilerOptions = new LinkedHashMap<>();
      List<String> include;

      TsConfig(@Nullable Iterable<InputFile> inputFiles, @Nullable List<String> include) {
        compilerOptions.put("allowJs", true);
        compilerOptions.put("noImplicitAny", true);
        if (inputFiles != null) {
          files = new ArrayList<>();
          inputFiles.forEach(f -> files.add(f.absolutePath()));
        }
        this.include = include;
      }

      List<String> writeFileWith(TsConfigFileCreator tsConfigFileCreator) {
        try {
          return singletonList(tsConfigFileCreator.createTsConfigFile(new Gson().toJson(this)));
        } catch (IOException e) {
          LOG.warn("Generating tsconfig.json failed", e);
          return emptyList();
        }
      }
    }

    private static String createTsConfigFile(String content) throws IOException {
      var tempFile = Files.createTempFile(null, null);
      Files.writeString(tempFile, content, StandardCharsets.UTF_8);
      return tempFile.toAbsolutePath().toString();
    }

    final SonarProduct product;
    final TsConfigFileCreator tsConfigFileCreator;

    GeneratedTsConfigFileProvider(SonarProduct product, @Nullable TsConfigFileCreator tsConfigFileCreator) {
      this.product = product;
      this.tsConfigFileCreator = tsConfigFileCreator == null ? TsConfigProvider.GeneratedTsConfigFileProvider::createTsConfigFile : tsConfigFileCreator;
    }

    @Override
    public final List<String> tsconfigs(SensorContext context) throws IOException {
      if (context.runtime().getProduct() != product) {
        // we don't support per analysis temporary files in SonarLint see https://jira.sonarsource.com/browse/SLCORE-235
        LOG.warn("Generating temporary tsconfig is not supported by {} in {} context.", getClass().getSimpleName(),
          context.runtime().getProduct());
        return emptyList();
      }
      return getDefaultTsConfigs(context);
    }

    abstract List<String> getDefaultTsConfigs(SensorContext context) throws IOException;
  }

  static class DefaultTsConfigProvider extends GeneratedTsConfigFileProvider {
    private final TempFolder folder;
    private final Function<FileSystem, FilePredicate> filePredicateProvider;

    DefaultTsConfigProvider(TempFolder folder, Function<FileSystem, FilePredicate> filePredicate) {
      super(SonarProduct.SONARQUBE, null);
      this.folder = folder;
      this.filePredicateProvider = filePredicate;
    }

    @Override
    List<String> getDefaultTsConfigs(SensorContext context) throws IOException {
      var inputFiles = context.fileSystem().inputFiles(filePredicateProvider.apply(context.fileSystem()));
      var tsConfig = new TsConfig(inputFiles, null);
      var tsconfigFile = writeToJsonFile(tsConfig);
      LOG.debug("Using generated tsconfig.json file {}", tsconfigFile.getAbsolutePath());
      return singletonList(tsconfigFile.getAbsolutePath());
    }

    private File writeToJsonFile(TsConfig tsConfig) throws IOException {
      String json = new Gson().toJson(tsConfig);
      File tsconfigFile = folder.newFile();
      Files.write(tsconfigFile.toPath(), json.getBytes(StandardCharsets.UTF_8));
      return tsconfigFile;
    }
  }

  static class WildcardTsConfigProvider extends GeneratedTsConfigFileProvider {
    private static String getProjectRoot(SensorContext context) {
      var projectBaseDir = context.fileSystem().baseDir().getAbsolutePath();
      return "/".equals(File.separator) ? projectBaseDir : projectBaseDir.replace(File.separator, "/");
    }

    private static final Map<String, List<String>> defaultWildcardTsConfig = new ConcurrentHashMap<>();

    private final boolean deactivated;

    WildcardTsConfigProvider(@Nullable JavaScriptProjectChecker checker) {
      this(checker, null);
    }

    WildcardTsConfigProvider(@Nullable JavaScriptProjectChecker checker, @Nullable TsConfigFileCreator tsConfigFileCreator) {
      super(SonarProduct.SONARLINT, tsConfigFileCreator);
      deactivated = checker == null || checker.isBeyondLimit();
    }

    @Override
    List<String> getDefaultTsConfigs(SensorContext context) {
      if (deactivated) {
        return emptyList();
      } else {
        return defaultWildcardTsConfig.computeIfAbsent(getProjectRoot(context), this::writeTsConfigFileFor);
      }
    }

    List<String> writeTsConfigFileFor(String root) {
      var config = new TsConfig(null, singletonList(root + "/**/*"));
      var file = config.writeFileWith(tsConfigFileCreator);
      LOG.debug("Using generated tsconfig.json file using wildcards {}", file);
      return file;
    }
  }

}
