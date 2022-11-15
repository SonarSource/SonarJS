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
import org.sonar.api.batch.fs.InputFile;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
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

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
    assertThat(tsconfigs).containsExactlyInAnyOrder(tsconfig1.toAbsolutePath().toString(), tsconfig2.toAbsolutePath().toString());
  }

  @Test
  void should_use_tsconfig_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty(JavaScriptPlugin.TSCONFIG_PATHS, "custom.tsconfig.json"));
    createInputFile(ctx, "file.ts");

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
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

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
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

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
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

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
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

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
    assertThat(tsconfigs).contains(baseDir.resolve("tsconfig.json").toAbsolutePath().toString());
    assertThat(logger.logs(LoggerLevel.INFO)).contains("Resolving TSConfig files using 'tsconfig.json' from property " + JavaScriptPlugin.TSCONFIG_PATHS_ALIAS);
  }

  @Test
  void should_create_tsconfig() throws Exception {
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
    assertThat(tsconfigs).hasSize(1);
    String tsconfig = new String(Files.readAllBytes(Paths.get(tsconfigs.get(0))), StandardCharsets.UTF_8);
    assertThat(tsconfig).isEqualTo("{\"files\":[\"moduleKey/file1.ts\",\"moduleKey/file2.ts\"],\"compilerOptions\":{}}");
  }

  @Test
  void should_create_wildcard_tsconfig() throws Exception {
    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    createInputFile(ctx, "file1.js");
    createInputFile(ctx, "file2.js");

    var provider = new TsConfigProvider.WildcardTsConfigProvider();
    var tsconfigs = provider.tsconfigs(ctx);
    assertThat(tsconfigs)
      .hasSize(1)
      .extracting(path -> Files.readString(Paths.get(path)))
      .contains(String.format("{\"compilerOptions\":{\"noImplicitAny\":true,\"allowJs\":true},\"include\":[\"%s/**/*\"]}", baseDir.toFile().getAbsolutePath().replace(File.separator, "/")));
  }

  @Test
  void should_create_analysed_file_tsconfig() throws IOException {
    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    var file1 = createInputFile(ctx, "file1.js");
    var file2 = createInputFile(ctx, "file2.js");

    var provider = new TsConfigProvider.AnalysedFileTsConfigProvider();
    var tsconfigs = provider.tsconfigs(ctx);
    assertThat(tsconfigs).isEmpty();
    assertThat(provider.getTsConfigsForFile(tsconfigs, file1))
      .hasSize(1)
      .extracting(path -> Files.readString(Paths.get(path)))
      .contains("{\"files\":[\"moduleKey/file1.js\"],\"compilerOptions\":{\"noImplicitAny\":true,\"allowJs\":true}}");
    assertThat(provider.getTsConfigsForFile(tsconfigs, file2))
      .hasSize(1)
      .extracting(path -> Files.readString(Paths.get(path)))
      .contains("{\"files\":[\"moduleKey/file2.js\"],\"compilerOptions\":{\"noImplicitAny\":true,\"allowJs\":true}}");
  }

  @Test
  void should_use_right_sonarlint_provider() throws IOException {
    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    var file1 = createInputFile(ctx, "file1.js");

    var checker = mock(JavaScriptProjectChecker.class);
    when(checker.isBeyondLimit()).thenReturn(false);

    var wildcardProvider = new TsConfigProvider.SonarLintProvider(checker);
    assertThat(wildcardProvider.tsconfigs(ctx))
      .hasSize(1)
      .extracting(path -> Files.readString(Paths.get(path)))
      .contains(String.format("{\"compilerOptions\":{\"noImplicitAny\":true,\"allowJs\":true},\"include\":[\"%s/**/*\"]}", baseDir.toFile().getAbsolutePath().replace(File.separator, "/")));

    when(checker.isBeyondLimit()).thenReturn(true);
    var analysedFileTsConfigProvider = new TsConfigProvider.SonarLintProvider(checker);
    assertThat(analysedFileTsConfigProvider.tsconfigs(ctx)).isEmpty();
    assertThat(analysedFileTsConfigProvider.getTsConfigsForFile(analysedFileTsConfigProvider.tsconfigs(ctx), file1))
      .hasSize(1)
      .extracting(path -> Files.readString(Paths.get(path)))
      .contains("{\"files\":[\"moduleKey/file1.js\"],\"compilerOptions\":{\"noImplicitAny\":true,\"allowJs\":true}}");

    var deactivatedProvider = new TsConfigProvider.SonarLintProvider(null);
    assertThat(deactivatedProvider.tsconfigs(ctx)).isEmpty();
    assertThat(deactivatedProvider.getTsConfigsForFile(deactivatedProvider.tsconfigs(ctx), file1)).isEmpty();
  }

  @Test
  void should_not_recreate_wildcart_tsconfig_in_sonarlint() throws Exception {
    List<String> tsconfigs;
    Path file;

    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));

    tsconfigs = new TsConfigProvider.WildcardTsConfigProvider().tsconfigs(ctx);
    assertThat(tsconfigs).hasSize(1);

    file = Path.of(tsconfigs.get(0));
    assertThat(file).exists();
    Files.delete(file);

    tsconfigs = new TsConfigProvider.WildcardTsConfigProvider().tsconfigs(ctx);
    assertThat(tsconfigs).hasSize(1).extracting(Path::of).contains(file);

    file = Path.of(tsconfigs.get(0));
    assertThat(file).doesNotExist();
  }

  @Test
  void should_not_recreate_analysed_file_tsconfig_in_sonarlint() throws Exception {
    List<String> tsconfigs;
    Path file;

    var ctx = SensorContextTester.create(baseDir);
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4, 4)));
    var inputFile1 = createInputFile(ctx, "inputFile1.js");
    var inputFile2 = createInputFile(ctx, "inputFile2.js");

    var provider = new TsConfigProvider.AnalysedFileTsConfigProvider();
    tsconfigs = provider.getTsConfigsForFile(provider.tsconfigs(ctx), inputFile1);
    assertThat(tsconfigs).hasSize(1);

    file = Path.of(tsconfigs.get(0));
    assertThat(file).exists();
    Files.delete(file);

    tsconfigs = provider.getTsConfigsForFile(provider.tsconfigs(ctx), inputFile1);
    assertThat(tsconfigs).hasSize(1).extracting(Path::of).contains(file);

    file = Path.of(tsconfigs.get(0));
    assertThat(file).doesNotExist();

    tsconfigs = provider.getTsConfigsForFile(provider.tsconfigs(ctx), inputFile2);
    assertThat(tsconfigs).hasSize(1);

    file = Path.of(tsconfigs.get(0));
    assertThat(file).exists();
  }

  @Test
  void should_not_fail_on_exception() throws Exception {
    var ctx = SensorContextTester.create(baseDir);
    var file = createInputFile(ctx, "file.js");

    var fileWriter = mock(TsConfigProvider.GeneratedTsConfigFileProvider.FileWriter.class);
    when(fileWriter.writeFile(anyString())).thenThrow(IOException.class);

    var wildcardTsConfigProvider = new TsConfigProvider.WildcardTsConfigProvider(fileWriter);
    assertThat(wildcardTsConfigProvider.tsconfigs(ctx)).isEmpty();
    assertThat(wildcardTsConfigProvider.getTsConfigsForFile(wildcardTsConfigProvider.tsconfigs(ctx), file)).isEmpty();

    var analysedFileTsConfigProvider = new TsConfigProvider.AnalysedFileTsConfigProvider(fileWriter);
    assertThat(analysedFileTsConfigProvider.tsconfigs(ctx)).isEmpty();
    assertThat(analysedFileTsConfigProvider.getTsConfigsForFile(analysedFileTsConfigProvider.tsconfigs(ctx), file)).isEmpty();
  }

  private static InputFile createInputFile(SensorContextTester context, String relativePath) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setLanguage("ts")
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
    return inputFile;
  }
}
