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
import org.mockito.stubbing.Answer;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.eslint.tsconfig.TsConfigFileCreator;
import org.sonar.plugins.javascript.eslint.tsconfig.TsConfigProvider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
    Path tsconfig2 = Files.createFile(subdir.resolve("tsconfig.json"));
    // these should not be taken into account
    Files.createFile(subdir.resolve("node_modules/tsconfig.json"));
    Files.createFile(subdir.resolve("base.tsconfig.json"));

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");

    List<String> tsconfigs = TsConfigProvider.searchForTsConfigFiles(ctx);
    assertThat(tsconfigs).containsExactlyInAnyOrder(tsconfig1.toAbsolutePath().toString(), tsconfig2.toAbsolutePath().toString());
  }

  @Test
  void should_use_tsconfig_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty(JavaScriptPlugin.TSCONFIG_PATHS, "custom.tsconfig.json"));
    createInputFile(ctx, "file.ts");

    List<String> tsconfigs = TsConfigProvider.searchForTsConfigFiles(ctx);
    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    assertThat(tsconfigs).containsExactly(absolutePath);
    assertThat(logger.logs(LoggerLevel.INFO)).contains("Resolving TSConfig files using 'custom.tsconfig.json' from property " + JavaScriptPlugin.TSCONFIG_PATHS);
  }

  @Test
  void should_use_absolute_path_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    ctx.setSettings(new MapSettings().setProperty(JavaScriptPlugin.TSCONFIG_PATHS, absolutePath));
    createInputFile(ctx, "file.ts");

    List<String> tsconfigs = TsConfigProvider.searchForTsConfigFiles(ctx);
    assertThat(tsconfigs).containsExactly(absolutePath);
  }

  @Test
  void should_use_multiple_tsconfigs_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();

    Files.createFile(baseDir.resolve("base.tsconfig.json"));
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    Files.createFile(baseDir.resolve("extended.tsconfig.json"));

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty(JavaScriptPlugin.TSCONFIG_PATHS, "base.tsconfig.json,custom.tsconfig.json,extended.tsconfig.json"));

    List<String> tsconfigs = TsConfigProvider.searchForTsConfigFiles(ctx);
    assertThat(tsconfigs).containsExactlyInAnyOrder(
      baseDir.resolve("base.tsconfig.json").toAbsolutePath().toString(),
      baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString(),
      baseDir.resolve("extended.tsconfig.json").toAbsolutePath().toString()
    );
    assertThat(logger.logs(LoggerLevel.INFO)).contains("Resolving TSConfig files using 'base.tsconfig.json,custom.tsconfig.json,extended.tsconfig.json' from property " + JavaScriptPlugin.TSCONFIG_PATHS);
  }

  @Test
  void should_use_matching_tsconfigs_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();

    Files.createFile(baseDir.resolve("tsconfig.settings.json"));
    Files.createFile(baseDir.resolve("tsconfig.ignored.json"));
    Files.createDirectories(Paths.get(baseDir.toAbsolutePath().toString(), "dir"));
    Files.createFile(baseDir.resolve(Paths.get("dir", "tsconfig.settings.json")));
    Files.createFile(baseDir.resolve(Paths.get("dir", "tsconfig.ignored.json")));

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty(JavaScriptPlugin.TSCONFIG_PATHS, "**/tsconfig.settings.json,**/tsconfig.custom.json"));

    List<String> tsconfigs = TsConfigProvider.searchForTsConfigFiles(ctx);
    assertThat(tsconfigs).containsExactlyInAnyOrder(
      baseDir.resolve("tsconfig.settings.json").toAbsolutePath().toString(),
      baseDir.resolve(Paths.get("dir", "tsconfig.settings.json")).toAbsolutePath().toString()
    );
  }

  @Test
  void should_use_tsconfigs_from_property_alias() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("tsconfig.json"));

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty(JavaScriptPlugin.TSCONFIG_PATHS_ALIAS, "tsconfig.json"));

    List<String> tsconfigs = TsConfigProvider.searchForTsConfigFiles(ctx);
    assertThat(tsconfigs).contains(baseDir.resolve("tsconfig.json").toAbsolutePath().toString());
    assertThat(logger.logs(LoggerLevel.INFO)).contains("Resolving TSConfig files using 'tsconfig.json' from property " + JavaScriptPlugin.TSCONFIG_PATHS_ALIAS);
  }

  @Test
  void should_create_tsconfig() throws Exception {
    var ctx = SensorContextTester.create(baseDir);
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");

    var tsConfigFileCreator = mock(TsConfigFileCreator.class);
    var tsConfigFile = "/path/to/tsconfig.json";
    when(tsConfigFileCreator.createTsConfigFile(anyString())).thenReturn(tsConfigFile);

    var checker = mock(ProjectChecker.class);
    when(checker.isBeyondLimit()).thenReturn(false);

    var tsconfigs = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, tsConfigFileCreator);
    assertThat(tsconfigs).isEmpty();
  }

  @Test
  void should_create_wildcard_tsconfig() throws Exception {
    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    createInputFile(ctx, "file1.js");
    createInputFile(ctx, "file2.js");

    var checker = mock(ProjectChecker.class);
    when(checker.isBeyondLimit()).thenReturn(false);

    var provider = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, TsConfigProviderTest::createTsConfigFile);
    var tsconfigs = provider;
    assertThat(tsconfigs)
      .hasSize(1)
      .extracting(path -> Files.readString(Paths.get(path)))
      .contains(String.format("{\"compilerOptions\":{\"allowJs\":true,\"noImplicitAny\":true},\"include\":[\"%s/**/*\"]}", baseDir.toFile().getAbsolutePath().replace(File.separator, "/")));

    when(checker.isBeyondLimit()).thenReturn(true);
    provider = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, TsConfigProviderTest::createTsConfigFile);
    assertThat(provider).isEmpty();

    provider = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, TsConfigProviderTest::createTsConfigFile);
    assertThat(provider).isEmpty();
  }

  @Test
  void should_not_recreate_wildcard_tsconfig_in_sonarlint_if_not_necessary() throws IOException {
    List<String> previous;
    List<String> last;

    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));

    var checker = mock(ProjectChecker.class);
    when(checker.isBeyondLimit()).thenReturn(false);

    var tsConfigFileCreator = mock(TsConfigFileCreator.class);
    when(tsConfigFileCreator.createTsConfigFile(anyString()))
      .thenAnswer((Answer<String>) invocation -> TsConfigProviderTest.createTsConfigFile(invocation.getArgument(0, String.class)));

    last = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, tsConfigFileCreator);
    assertThat(last).hasSize(1);
    previous = last;
    verify(tsConfigFileCreator, times(1)).createTsConfigFile(anyString());

    last = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, tsConfigFileCreator);
    assertThat(last).isEqualTo(previous);
    previous = last;
    verify(tsConfigFileCreator, times(1)).createTsConfigFile(anyString());

    Files.delete(Path.of(last.get(0)));

    last = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, tsConfigFileCreator);
    assertThat(last).isNotEqualTo(previous);
    verify(tsConfigFileCreator, times(2)).createTsConfigFile(anyString());
  }

  @Test
  void should_not_fail_and_not_store_on_null() throws IOException {
    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));

    var checker = mock(ProjectChecker.class);
    when(checker.isBeyondLimit()).thenReturn(false);

    var tsConfigFileCreator = mock(TsConfigFileCreator.class);
    when(tsConfigFileCreator.createTsConfigFile(anyString())).thenReturn(null);

    TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, tsConfigFileCreator);
    verify(tsConfigFileCreator, times(1)).createTsConfigFile(anyString());
    TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, tsConfigFileCreator);
    verify(tsConfigFileCreator, times(2)).createTsConfigFile(anyString());
  }

  @Test
  void should_not_fail_on_exception() throws Exception {
    var ctx = SensorContextTester.create(baseDir);
    createInputFile(ctx, "file.js");

    var checker = mock(ProjectChecker.class);
    when(checker.isBeyondLimit()).thenReturn(false);

    var fileWriter = mock(TsConfigFileCreator.class);
    when(fileWriter.createTsConfigFile(anyString())).thenThrow(IOException.class);

    var wildcardTsConfigProvider = TsConfigProvider.generateDefaultTsConfigFile(ctx, checker, fileWriter);
    assertThat(wildcardTsConfigProvider).isEmpty();
  }

  private static void createInputFile(SensorContextTester context, String relativePath) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setLanguage("ts")
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
  }

  public static String createTsConfigFile(String baseDir) throws IOException {
    var tempFile = Files.createTempFile(null, null);
    var content = String.format("{\"compilerOptions\":{\"allowJs\":true,\"noImplicitAny\":true},\"include\":[\"%s/**/*\"]}", baseDir);
    Files.writeString(tempFile, content, StandardCharsets.UTF_8);
    return tempFile.toAbsolutePath().toString();
  }

}
