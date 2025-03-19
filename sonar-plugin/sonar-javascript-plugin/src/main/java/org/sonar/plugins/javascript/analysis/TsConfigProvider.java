/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.sonar.plugins.javascript.JavaScriptPlugin.MAX_FILES_PROPERTY;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS;
import static org.sonar.plugins.javascript.analysis.LookupConfigProviderFilter.FileFilter;
import static org.sonar.plugins.javascript.analysis.LookupConfigProviderFilter.PathFilter;

import com.google.gson.Gson;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.sonarlint.TsConfigCache;
import org.sonarsource.analyzer.commons.FileProvider;

public class TsConfigProvider {

  private static final Logger LOG = LoggerFactory.getLogger(TsConfigProvider.class);

  interface Provider {
    List<String> tsconfigs(JsTsContext<?> context) throws IOException;

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

  TsConfigProvider(List<Provider> providers) {
    this(providers, null);
  }

  /**
   * Relying on (in order of priority)
   * 1. Property sonar.typescript.tsconfigPath(s)
   * 2. Looking up file system
   * 3. Creating a tmp tsconfig.json listing all files
   */
  static List<String> getTsConfigs(
    JsTsContext<?> context,
    TsConfigProvider.TsConfigFileCreator tsConfigFileCreator
  ) throws IOException {
    var provider = new TsConfigProvider(
      List.of(
        new PropertyTsConfigProvider(),
        new LookupTsConfigProvider(),
        new TsConfigProvider.DefaultTsConfigProvider(
          tsConfigFileCreator,
          JavaScriptFilePredicate::getJsTsPredicate
        )
      )
    );
    return provider.tsconfigs(context);
  }

  /**
   * Fill tsConfigCache with the tsconfigs found in the order listed by the
   * providers. No need to return the list of tsconfigs
   * because we get the tsconfig file from the cache.
   */
  static void initializeTsConfigCache(
    JsTsContext<?> context,
    TsConfigProvider.TsConfigFileCreator tsConfigFileCreator,
    TsConfigCache tsConfigCache
  ) throws IOException {
    var provider = new TsConfigProvider(
      List.of(
        new PropertyTsConfigProvider(),
        new LookupTsConfigProvider(tsConfigCache),
        new TsConfigProvider.WildcardTsConfigProvider(tsConfigCache, tsConfigFileCreator)
      ),
      tsConfigCache
    );
    provider.tsconfigs(context);
  }

  List<String> tsconfigs(JsTsContext<?> context) throws IOException {
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
    public List<String> tsconfigs(JsTsContext<?> context) {
      var tsconfigPaths = context.getTsConfigPaths();
      if (tsconfigPaths.isEmpty()) {
        return emptyList();
      }
      LOG.info(
        "Resolving TSConfig files using '{}' from property {}",
        String.join(",", tsconfigPaths),
        TSCONFIG_PATHS
      );
      File baseDir = context.getSensorContext().fileSystem().baseDir();

      List<String> tsconfigs = new ArrayList<>();
      for (String tsconfigPath : tsconfigPaths) {
        LOG.debug("Using '{}' to resolve TSConfig file(s)", tsconfigPath);

        /** Resolving a TSConfig file based on a path */
        Path tsconfig = getFilePath(baseDir, tsconfigPath);
        if (tsconfig != null) {
          tsconfigs.add(tsconfig.toString());
          continue;
        }

        /** Resolving TSConfig files based on pattern matching */
        FileProvider fileProvider = new FileProvider(baseDir, tsconfigPath);
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

    LookupTsConfigProvider() {
      this(null);
    }

    @Override
    public List<String> tsconfigs(JsTsContext<?> context) {
      if (cache != null) {
        var tsconfigs = cache.listCachedTsConfigs(TsConfigOrigin.LOOKUP);
        if (tsconfigs != null) {
          return tsconfigs;
        }
      }
      var fs = context.getSensorContext().fileSystem();
      var fileCount = 0;
      var fileFilter = new FileFilter(context);
      var pathFilter = new PathFilter(context);
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
          if (!pathFilter.test(file.toPath())) {
            continue;
          }
          if (file.isDirectory()) {
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
    public final List<String> tsconfigs(JsTsContext<?> context) throws IOException {
      SonarProduct contextProduct = context.getSensorContext().runtime().getProduct();
      if (contextProduct != product) {
        // we don't support per analysis temporary files in SonarLint see https://jira.sonarsource.com/browse/SLCORE-235
        LOG.warn(
          "Generating temporary tsconfig is not supported by {} in {} context.",
          getClass().getSimpleName(),
          contextProduct
        );
        return emptyList();
      }
      return getDefaultTsConfigs(context);
    }

    abstract List<String> getDefaultTsConfigs(JsTsContext<?> context) throws IOException;
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
    List<String> getDefaultTsConfigs(JsTsContext<?> context) throws IOException {
      var fs = context.getSensorContext().fileSystem();
      var inputFiles = fs.inputFiles(filePredicateProvider.apply(fs));
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

    private static final Map<String, List<String>> defaultWildcardTsConfig =
      new ConcurrentHashMap<>();

    final TsConfigCache tsConfigCache;
    final TsConfigFileCreator tsConfigFileCreator;

    WildcardTsConfigProvider(
      @Nullable TsConfigCache tsConfigCache,
      TsConfigFileCreator tsConfigFileCreator
    ) {
      super(SonarProduct.SONARLINT);
      this.tsConfigCache = tsConfigCache;
      this.tsConfigFileCreator = tsConfigFileCreator;
    }

    private static String getProjectRoot(JsTsContext<?> context) {
      var projectBaseDir = context.getSensorContext().fileSystem().baseDir().getAbsolutePath();
      return "/".equals(File.separator)
        ? projectBaseDir
        : projectBaseDir.replace(File.separator, "/");
    }

    @Override
    List<String> getDefaultTsConfigs(JsTsContext<?> context) {
      boolean deactivated =
        tsConfigCache == null || isBeyondLimit(context, tsConfigCache.getProjectSize());
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

    static boolean isBeyondLimit(JsTsContext<?> context, int projectSize) {
      var typeCheckingLimit = context.getTypeCheckingLimit();

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
  }
}
