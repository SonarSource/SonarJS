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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS;
import static org.sonar.plugins.javascript.JavaScriptPlugin.TSCONFIG_PATHS_ALIAS;
import static org.sonar.plugins.javascript.analysis.TsConfigProvider.TsConfigFileCreator;
import static org.sonar.plugins.javascript.analysis.TsConfigProvider.WildcardTsConfigProvider;
import static org.sonar.plugins.javascript.analysis.TsConfigProvider.getTsConfigs;
import static org.sonar.plugins.javascript.analysis.TsConfigProvider.initializeTsConfigCache;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.sonarlint.TsConfigCache;
import org.sonar.plugins.javascript.sonarlint.TsConfigCacheImpl;

class TsConfigProviderTest {

  @RegisterExtension
  public LogTesterJUnit5 logger = new LogTesterJUnit5();

  @TempDir
  Path baseDir;

  @TempDir
  File tempDir;

  TempFolder tempFolder;

  @BeforeEach
  void setUp() {
    tempFolder = new DefaultTempFolder(tempDir, true);
  }

  @Test
  void should_lookup_tsconfig_files() throws Exception {
    Path tsconfig1 = baseDir.resolve("tsconfig.json");
    Files.createFile(tsconfig1);
    Path subdir = baseDir.resolve("subdir");
    Files.createDirectory(subdir);
    Files.createDirectory(subdir.resolve("node_modules"));
    Files.createDirectory(subdir.resolve(".git"));
    Path tsconfig2 = Files.createFile(subdir.resolve("tsconfig.json"));
    // these should not be taken into account
    Files.createFile(subdir.resolve("node_modules/tsconfig.json"));
    Files.createFile(subdir.resolve(".git/tsconfig.json"));
    Files.createFile(subdir.resolve("base.tsconfig.json"));

    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");

    List<String> tsconfigs = getTsConfigs(ctx, this::tsConfigFileCreator);
    assertThat(tsconfigs).containsExactlyInAnyOrder(
      tsconfig1.toAbsolutePath().toString(),
      tsconfig2.toAbsolutePath().toString()
    );
  }

  String tsConfigFileCreator(String content) throws IOException {
    var path = tempFolder.newFile().toPath();
    Files.writeString(path, content);
    return path.toString();
  }

  @Test
  void should_use_tsconfig_from_property() throws Exception {
    baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx
      .getSensorContext()
      .setSettings(new MapSettings().setProperty(TSCONFIG_PATHS, "custom.tsconfig.json"));
    createInputFile(ctx, "file.ts");

    List<String> tsconfigs = getTsConfigs(ctx, this::tsConfigFileCreator);
    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    assertThat(tsconfigs).containsExactly(absolutePath);
    assertThat(logger.logs(LoggerLevel.INFO)).contains(
      "Resolving TSConfig files using 'custom.tsconfig.json' from property " + TSCONFIG_PATHS
    );
  }

  @Test
  void should_use_absolute_path_from_property() throws Exception {
    baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    ctx.getSensorContext().setSettings(new MapSettings().setProperty(TSCONFIG_PATHS, absolutePath));
    createInputFile(ctx, "file.ts");

    List<String> tsconfigs = getTsConfigs(ctx, this::tsConfigFileCreator);
    assertThat(tsconfigs).containsExactly(absolutePath);
  }

  @Test
  void should_use_multiple_tsconfigs_from_property() throws Exception {
    baseDir = tempFolder.newDir().toPath();

    Files.createFile(baseDir.resolve("base.tsconfig.json"));
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    Files.createFile(baseDir.resolve("extended.tsconfig.json"));

    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx
      .getSensorContext()
      .setSettings(
        new MapSettings()
          .setProperty(
            TSCONFIG_PATHS,
            "base.tsconfig.json,custom.tsconfig.json,extended.tsconfig.json"
          )
      );

    List<String> tsconfigs = getTsConfigs(ctx, this::tsConfigFileCreator);
    assertThat(tsconfigs).containsExactlyInAnyOrder(
      baseDir.resolve("base.tsconfig.json").toAbsolutePath().toString(),
      baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString(),
      baseDir.resolve("extended.tsconfig.json").toAbsolutePath().toString()
    );
    assertThat(logger.logs(LoggerLevel.INFO)).contains(
      "Resolving TSConfig files using 'base.tsconfig.json,custom.tsconfig.json,extended.tsconfig.json' from property " +
      TSCONFIG_PATHS
    );
  }

  @Test
  void should_use_matching_tsconfigs_from_property() throws Exception {
    baseDir = tempFolder.newDir().toPath();

    Files.createFile(baseDir.resolve("tsconfig.settings.json"));
    Files.createFile(baseDir.resolve("tsconfig.ignored.json"));
    Files.createDirectories(Paths.get(baseDir.toAbsolutePath().toString(), "dir"));
    Files.createFile(baseDir.resolve(Paths.get("dir", "tsconfig.settings.json")));
    Files.createFile(baseDir.resolve(Paths.get("dir", "tsconfig.ignored.json")));

    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx
      .getSensorContext()
      .setSettings(
        new MapSettings()
          .setProperty(TSCONFIG_PATHS, "**/tsconfig.settings.json,**/tsconfig.custom.json")
      );

    List<String> tsconfigs = getTsConfigs(ctx, this::tsConfigFileCreator);
    assertThat(tsconfigs).containsExactlyInAnyOrder(
      baseDir.resolve("tsconfig.settings.json").toAbsolutePath().toString(),
      baseDir.resolve(Paths.get("dir", "tsconfig.settings.json")).toAbsolutePath().toString()
    );
  }

  @Test
  void should_use_tsconfigs_from_property_alias() throws Exception {
    baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("tsconfig.json"));

    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx
      .getSensorContext()
      .setSettings(new MapSettings().setProperty(TSCONFIG_PATHS_ALIAS, "tsconfig.json"));

    List<String> tsconfigs = getTsConfigs(ctx, this::tsConfigFileCreator);
    assertThat(tsconfigs).contains(baseDir.resolve("tsconfig.json").toAbsolutePath().toString());
    assertThat(logger.logs(LoggerLevel.INFO)).contains(
      "Resolving TSConfig files using 'tsconfig.json' from property " + TSCONFIG_PATHS
    );
  }

  @Test
  void should_create_tsconfig() throws Exception {
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");

    List<String> tsconfigs = getTsConfigs(ctx, this::tsConfigFileCreator);
    assertThat(tsconfigs).hasSize(1);
    String tsconfig = Files.readString(Paths.get(tsconfigs.get(0)));
    String expectedBaseDir = this.baseDir.toString().replaceAll("[\\\\/]", "/");
    assertThat(tsconfig).isEqualToIgnoringCase(
      String.format(
        "{\"files\":[\"%s/file1.ts\",\"%s/file2.ts\"],\"compilerOptions\":{\"allowJs\":true,\"noImplicitAny\":true}}",
        expectedBaseDir,
        expectedBaseDir
      )
    );
  }

  @Test
  void should_create_wildcard_tsconfig() throws Exception {
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx.getSensorContext().setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    createInputFile(ctx, "file1.js");
    createInputFile(ctx, "file2.js");
    var tsConfigCache = tsConfigCache();
    initializeTsConfigCache(ctx, this::tsConfigFileCreator, tsConfigCache);

    assertThat(tsConfigCache.listCachedTsConfigs(TsConfigOrigin.FALLBACK))
      .hasSize(1)
      .extracting(path -> Files.readString(Paths.get(path)))
      .contains(
        String.format(
          "{\"compilerOptions\":{\"allowJs\":true,\"noImplicitAny\":true},\"include\":[\"%s/**/*\"]}",
          baseDir.toFile().getAbsolutePath().replace(File.separator, "/")
        )
      );
  }

  @Test
  void should_not_recreate_wildcard_tsconfig_in_sonarlint() throws Exception {
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx.getSensorContext().setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));

    var tsConfigCache = tsConfigCache();
    initializeTsConfigCache(ctx, this::tsConfigFileCreator, tsConfigCache);

    var tsconfigs = new WildcardTsConfigProvider(
      tsConfigCache,
      TsConfigProviderTest::createTsConfigFile
    ).tsconfigs(ctx);
    assertThat(tsconfigs).isEqualTo(tsConfigCache.listCachedTsConfigs(TsConfigOrigin.FALLBACK));
  }

  @Test
  void should_not_create_wildcard_tsconfig_in_sonarlint() throws Exception {
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx.getSensorContext().setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    ctx
      .getSensorContext()
      .setSettings(new MapSettings().setProperty(JavaScriptPlugin.MAX_FILES_PROPERTY, 1));
    createInputFile(ctx, "file.js");
    createInputFile(ctx, "file2.js");

    var tsConfigCache = tsConfigCache();
    initializeTsConfigCache(ctx, this::tsConfigFileCreator, tsConfigCache);
    assertThat(tsConfigCache.listCachedTsConfigs(TsConfigOrigin.FALLBACK)).isEmpty();
  }

  @Test
  void should_not_fail_on_exception() throws Exception {
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    createInputFile(ctx, "file.js");

    var tsConfigCache = tsConfigCache();
    tsConfigCache.setProjectSize(1);

    var fileWriter = mock(TsConfigFileCreator.class);
    when(fileWriter.createTsConfigFile(anyString())).thenThrow(IOException.class);

    var wildcardTsConfigProvider = new WildcardTsConfigProvider(tsConfigCache, fileWriter);
    assertThat(wildcardTsConfigProvider.tsconfigs(ctx)).isEmpty();
  }

  @Test
  void should_check_javascript_files() throws IOException {
    logger.setLevel(LoggerLevel.INFO);
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx.getSensorContext().setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    createInputFile(ctx, "file.js");
    createInputFile(ctx, "file.css");
    createInputFile(ctx, "file.d.ts");
    Files.createDirectory(Path.of(baseDir.toString(), "node_modules"));
    createInputFile(ctx, "node_modules/dep.js");

    var tsConfigCache = tsConfigCache();
    initializeTsConfigCache(ctx, this::tsConfigFileCreator, tsConfigCache);
    assertThat(logger.logs()).contains("Turning on type-checking of JavaScript files");
  }

  @Test
  void should_detect_projects_with_too_many_files() throws IOException {
    logger.setLevel(LoggerLevel.WARN);
    var ctx = new JsTsContext<SensorContextTester>(SensorContextTester.create(baseDir));
    ctx
      .getSensorContext()
      .setSettings(new MapSettings().setProperty(JavaScriptPlugin.MAX_FILES_PROPERTY, 3));
    createInputFile(ctx, "file1.js");
    createInputFile(ctx, "file2.ts");
    createInputFile(ctx, "file3.cjs");
    createInputFile(ctx, "file4.cts");
    var tsConfigCache = tsConfigCache();
    initializeTsConfigCache(ctx, this::tsConfigFileCreator, tsConfigCache);
    assertThat(
      WildcardTsConfigProvider.isBeyondLimit(ctx, tsConfigCache.getProjectSize())
    ).isTrue();
    assertThat(logger.logs()).contains(
      "Turning off type-checking of JavaScript files due to the project size exceeding the limit (3 files)",
      "This may cause rules dependent on type information to not behave as expected",
      "Check the list of impacted rules at https://rules.sonarsource.com/javascript/tag/type-dependent",
      "To turn type-checking back on, increase the \"" +
      JavaScriptPlugin.MAX_FILES_PROPERTY +
      "\" property value",
      "Please be aware that this could potentially impact the performance of the analysis"
    );
  }

  private void createInputFile(JsTsContext<SensorContextTester> context, String relativePath)
    throws IOException {
    DefaultInputFile inputFile = new TestInputFileBuilder(baseDir.toString(), relativePath)
      .setLanguage("ts")
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.getSensorContext().fileSystem().add(inputFile);
    Files.createFile(Paths.get(baseDir.toString(), relativePath));
  }

  private static String createTsConfigFile(String content) throws IOException {
    var tempFile = Files.createTempFile(null, null);
    Files.writeString(tempFile, content, StandardCharsets.UTF_8);
    return tempFile.toAbsolutePath().toString();
  }

  private TsConfigCache tsConfigCache() {
    return new TsConfigCacheImpl(mock(BridgeServer.class));
  }
}
