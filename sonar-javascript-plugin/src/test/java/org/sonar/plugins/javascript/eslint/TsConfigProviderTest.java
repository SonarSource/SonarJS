/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.internal.JUnitTempFolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

public class TsConfigProviderTest {

  @Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  private Path baseDir;

  @Before
  public void setUp() {
    baseDir = tempFolder.newDir().toPath();
  }

  @Test
  public void should_lookup_tsconfig_files() throws Exception {
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
  public void should_use_tsconfig_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.typescript.tsconfigPath", "custom.tsconfig.json"));
    createInputFile(ctx, "file.ts");

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    assertThat(tsconfigs).containsExactly(absolutePath);
  }

  @Test
  public void should_validate_tsconfig_from_property() throws Exception {
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(new MapSettings().setProperty("sonar.typescript.tsconfigPath", "custom.tsconfig.json"));
    createInputFile(ctx, "file.ts");

    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    assertThatThrownBy(() -> new TsConfigProvider(tempFolder).tsconfigs(ctx))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("Provided tsconfig.json path doesn't exist. Path: '" + absolutePath + "'");
  }

  @Test
  public void should_use_absolute_path_from_property() throws Exception {
    Path baseDir = tempFolder.newDir().toPath();
    Files.createFile(baseDir.resolve("custom.tsconfig.json"));
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    String absolutePath = baseDir.resolve("custom.tsconfig.json").toAbsolutePath().toString();
    ctx.setSettings(new MapSettings().setProperty("sonar.typescript.tsconfigPath", absolutePath));
    createInputFile(ctx, "file.ts");

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
    assertThat(tsconfigs).containsExactly(absolutePath);
  }

  @Test
  public void should_create_tsconfig() throws Exception {
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
    assertThat(tsconfigs).hasSize(1);
    String tsconfig = new String(Files.readAllBytes(Paths.get(tsconfigs.get(0))), StandardCharsets.UTF_8);
    assertThat(tsconfig).isEqualTo("{\"files\":[\"moduleKey/file1.ts\",\"moduleKey/file2.ts\"],\"compilerOptions\":{}}");
  }

  @Test
  public void should_not_create_tsconfig_in_sonarlint() throws Exception {
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    createInputFile(ctx, "file1.ts");
    createInputFile(ctx, "file2.ts");
    ctx.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(4,4)));

    List<String> tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(ctx);
    assertThat(tsconfigs).isEmpty();
  }

  private static void createInputFile(SensorContextTester context, String relativePath) {
    DefaultInputFile inputFile = new TestInputFileBuilder("moduleKey", relativePath)
      .setLanguage("ts")
      .setContents("if (cond)\ndoFoo(); \nelse \ndoFoo();")
      .build();
    context.fileSystem().add(inputFile);
  }
}
