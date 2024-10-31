/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import static java.util.Arrays.stream;
import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static java.util.stream.Stream.concat;

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
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
import java.util.function.Predicate;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.WildcardPattern;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.sonarlint.TsConfigCache;
import org.sonarsource.analyzer.commons.FileProvider;

public class TsConfigProvider {

  public static final String TSCONFIG_PATHS = "sonar.typescript.tsconfigPaths";
  public static final String TSCONFIG_PATHS_ALIAS = "sonar.typescript.tsconfigPath";
  private static final Logger LOG = LoggerFactory.getLogger(TsConfigProvider.class);

  interface Provider {
    List<String> tsconfigs(SensorContext context) throws IOException;
    TsConfigOrigin type();
  }

  @FunctionalInterface
  interface TsConfigFileCreator {
    String createTsConfigFile(String content) throws IOException;
  }

  private final List<Provider> providers;
  private final TsConfigCache cache;

  TsConfigProvider(List<Provider> providers, @Nullable TsConfigCache cache) {
    this.providers = providers;
    this.cache = cache;
  }

  /**
   * Relying on (in order of priority)
   * 1. Property sonar.typescript.tsconfigPath(s)
   * 2. Looking up file system
   * 3. Creating a tmp tsconfig.json listing all files
   */
  static List<String> getTsConfigs(
    ContextUtils contextUtils,
    TsConfigProvider.TsConfigFileCreator tsConfigFileCreator,
    @Nullable TsConfigCache tsConfigCache
  ) throws IOException {
    var defaultProvider = contextUtils.isSonarLint()
      ? new TsConfigProvider.WildcardTsConfigProvider(tsConfigCache, tsConfigFileCreator)
      : new TsConfigProvider.DefaultTsConfigProvider(tsConfigFileCreator, JavaScriptFilePredicate::getJsTsPredicate);


    var provider = new TsConfigProvider(
      List.of(new PropertyTsConfigProvider(), new LookupTsConfigProvider(tsConfigCache), defaultProvider),
      tsConfigCache
    );

    return provider.tsconfigs(contextUtils.context());
  }

  List<String> tsconfigs(SensorContext context) throws IOException {
    for (Provider provider : providers) {
      List<String> tsconfigs = provider.tsconfigs(context);
      if (cache != null) {
        cache.initializeWith(tsconfigs, provider.type());
      }
      if (!tsconfigs.isEmpty()) {
        if (cache != null) {
          cache.setOrigin(provider.type());
        }
        return tsconfigs;
      }
    }
    return emptyList();
  }

  static class PropertyTsConfigProvider implements Provider {
    @Override
    public List<String> tsconfigs(SensorContext context) {
      if (
        !context.config().hasKey(TSCONFIG_PATHS) &&
        !context.config().hasKey(TSCONFIG_PATHS_ALIAS)
      ) {
        return emptyList();
      }

      String property = context.config().hasKey(TSCONFIG_PATHS)
        ? TSCONFIG_PATHS
        : TSCONFIG_PATHS_ALIAS;
      Set<String> patterns = new HashSet<>(
        Arrays.asList(context.config().getStringArray(property))
      );

      LOG.info(
        "Resolving TSConfig files using '{}' from property {}",
        String.join(",", patterns),
        property
      );

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
          tsconfigs.addAll(matchingTsconfigs.stream().map(File::getAbsolutePath).toList());
        }
      }
      LOG.info("Found {} TSConfig file(s): {}", tsconfigs.size(), tsconfigs);

      return tsconfigs;
    }

    public TsConfigOrigin type() {
      return TsConfigOrigin.PROPERTY;
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
    private final TsConfigCache cache;
    LookupTsConfigProvider(@Nullable TsConfigCache cache) {
      this.cache = cache;
    }

    @Override
    public List<String> tsconfigs(SensorContext context) {
      if (cache != null) {
        var tsconfigs = cache.listCachedTsConfigs(TsConfigOrigin.LOOKUP);
        if (tsconfigs != null) {
          return tsconfigs;
        }
      }
      var fs = context.fileSystem();
      var fileCount = 0;
      var fileFilter = new FileFilter(context.config());
      var pathFilter = new PathFilter(context.config());
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
          if (file.isDirectory() && !pathFilter.test(file.toPath())) {
            dirs.add(file);
          } else {
            if (fileFilter.test(file.toPath())) {
              fileCount++;
            } else if ("tsconfig.json".equals(file.getName())) {
              tsconfigs.add(file.getAbsolutePath());
            }
          }
        }
      }
      LOG.info("Found {} tsconfig.json file(s): {}", tsconfigs.size(), tsconfigs);
      if (cache != null) {
        cache.setProjectSize(fileCount);
      }
      return tsconfigs;
    }

    public TsConfigOrigin type() {
      return TsConfigOrigin.LOOKUP;
    }

    static class FileFilter implements Predicate<Path> {

      private final Set<String> extensions = new HashSet<>();

      public FileFilter(Configuration config) {
        extensions.addAll(
          Arrays.asList(
            config
              .get(JavaScriptLanguage.FILE_SUFFIXES_KEY)
              .orElse(JavaScriptLanguage.FILE_SUFFIXES_DEFVALUE)
              .split(",")
          )
        );
        extensions.addAll(
          Arrays.asList(
            config
              .get(TypeScriptLanguage.FILE_SUFFIXES_KEY)
              .orElse(TypeScriptLanguage.FILE_SUFFIXES_DEFVALUE)
              .split(",")
          )
        );
      }

      @Override
      public boolean test(Path path) {
        return extensions.stream().anyMatch(ext -> path.toString().endsWith(ext));
      }
    }

    static class PathFilter implements Predicate<Path> {

      private final WildcardPattern[] exclusions;

      public PathFilter(Configuration config) {
        if (!isExclusionOverridden(config)) {
          exclusions = WildcardPattern.create(JavaScriptPlugin.EXCLUSIONS_DEFAULT_VALUE);
        } else {
          WildcardPattern[] jsExcludedPatterns = WildcardPattern.create(
            config.getStringArray(JavaScriptPlugin.JS_EXCLUSIONS_KEY)
          );
          WildcardPattern[] tsExcludedPatterns = WildcardPattern.create(
            config.getStringArray(JavaScriptPlugin.TS_EXCLUSIONS_KEY)
          );
          exclusions =
            concat(stream(jsExcludedPatterns), stream(tsExcludedPatterns))
              .toArray(WildcardPattern[]::new);
        }
      }

      private static boolean isExclusionOverridden(Configuration config) {
        return (
          config.get(JavaScriptPlugin.JS_EXCLUSIONS_KEY).isPresent() ||
            config.get(JavaScriptPlugin.TS_EXCLUSIONS_KEY).isPresent()
        );
      }

      @Override
      public boolean test(Path path) {
        return WildcardPattern.match(exclusions, path.toString().replaceAll("[\\\\/]", "/"));
      }
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

    final SonarProduct product;

    GeneratedTsConfigFileProvider(SonarProduct product) {
      this.product = product;
    }

    public TsConfigOrigin type() {
      return TsConfigOrigin.FALLBACK;
    }

    @Override
    public final List<String> tsconfigs(SensorContext context) throws IOException {
      if (context.runtime().getProduct() != product) {
        // we don't support per analysis temporary files in SonarLint see https://jira.sonarsource.com/browse/SLCORE-235
        LOG.warn(
          "Generating temporary tsconfig is not supported by {} in {} context.",
          getClass().getSimpleName(),
          context.runtime().getProduct()
        );
        return emptyList();
      }
      return getDefaultTsConfigs(context);
    }

    abstract List<String> getDefaultTsConfigs(SensorContext context) throws IOException;
  }

  static class DefaultTsConfigProvider extends GeneratedTsConfigFileProvider {
    private final Function<FileSystem, FilePredicate> filePredicateProvider;
    private final TsConfigFileCreator tsConfigFileCreator;

    DefaultTsConfigProvider(
      TsConfigFileCreator tsConfigFileCreator,
      Function<FileSystem, FilePredicate> filePredicate
    ) {
      super(SonarProduct.SONARQUBE);
      this.tsConfigFileCreator = tsConfigFileCreator;
      this.filePredicateProvider = filePredicate;
    }

    @Override
    List<String> getDefaultTsConfigs(SensorContext context) throws IOException {
      var inputFiles = context
        .fileSystem()
        .inputFiles(filePredicateProvider.apply(context.fileSystem()));
      var tsConfig = new TsConfig(inputFiles, null);
      var tsconfigFile = writeToJsonFile(tsConfig);
      LOG.debug("Using generated tsconfig.json file {}", tsconfigFile.getAbsolutePath());
      return singletonList(tsconfigFile.getAbsolutePath());
    }

    private File writeToJsonFile(TsConfig tsConfig) throws IOException {
      String json = new Gson().toJson(tsConfig);
      return Path.of(tsConfigFileCreator.createTsConfigFile(json)).toFile();
    }
  }

  static class WildcardTsConfigProvider extends GeneratedTsConfigFileProvider {
    static final String MAX_FILES_PROPERTY = "sonar.javascript.sonarlint.typechecking.maxfiles";
    static final int DEFAULT_MAX_FILES_FOR_TYPE_CHECKING = 20_000;

    private static String getProjectRoot(SensorContext context) {
      var projectBaseDir = context.fileSystem().baseDir().getAbsolutePath();
      return "/".equals(File.separator)
        ? projectBaseDir
        : projectBaseDir.replace(File.separator, "/");
    }

    private static final Map<String, List<String>> defaultWildcardTsConfig =
      new ConcurrentHashMap<>();

    final TsConfigFileCreator tsConfigFileCreator;
    final TsConfigCache tsConfigCache;

    WildcardTsConfigProvider(
      @Nullable TsConfigCache tsConfigCache,
      TsConfigFileCreator tsConfigFileCreator
    ) {
      super(SonarProduct.SONARLINT);
      this.tsConfigFileCreator = tsConfigFileCreator;
      this.tsConfigCache = tsConfigCache;
    }

    @Override
    List<String> getDefaultTsConfigs(SensorContext context) {
      boolean deactivated = tsConfigCache == null || isBeyondLimit(context, tsConfigCache.getProjectSize());
      if (deactivated) {
        return emptyList();
      } else {
        return defaultWildcardTsConfig.computeIfAbsent(
          getProjectRoot(context),
          this::writeTsConfigFileFor
        );
      }
    }

    List<String> writeTsConfigFileFor(String root) {
      var config = new TsConfig(null, singletonList(root + "/**/*"));
      var file = config.writeFileWith(tsConfigFileCreator);
      LOG.debug("Using generated tsconfig.json file using wildcards {}", file);
      return file;
    }

    static boolean isBeyondLimit(SensorContext context, int projectSize) {
      var typeCheckingLimit = getTypeCheckingLimit(context);

      var beyondLimit = projectSize >= typeCheckingLimit;
      if (!beyondLimit) {
        LOG.info("Turning on type-checking of JavaScript files");
      } else {
        // TypeScript type checking mechanism creates performance issues for large projects. Analyzing a file can take more than a minute in
        // SonarLint, and it can even lead to runtime errors due to Node.js being out of memory during the process.
        LOG.warn(
          "Turning off type-checking of JavaScript files due to the project size exceeding the limit ({} files)",
          typeCheckingLimit
        );
        LOG.warn("This may cause rules dependent on type information to not behave as expected");
        LOG.warn(
          "Check the list of impacted rules at https://rules.sonarsource.com/javascript/tag/type-dependent"
        );
        LOG.warn(
          "To turn type-checking back on, increase the \"{}\" property value",
          MAX_FILES_PROPERTY
        );
        LOG.warn(
          "Please be aware that this could potentially impact the performance of the analysis"
        );
      }
      return beyondLimit;
    }

    static int getTypeCheckingLimit(SensorContext context) {
      return Math.max(
        context.config().getInt(MAX_FILES_PROPERTY).orElse(DEFAULT_MAX_FILES_FOR_TYPE_CHECKING),
        0
      );
    }
  }
}
