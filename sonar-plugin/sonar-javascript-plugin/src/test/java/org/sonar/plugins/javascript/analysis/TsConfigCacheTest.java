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

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.TempFolder;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonarsource.sonarlint.core.analysis.container.module.DefaultModuleFileEvent;
import org.sonarsource.sonarlint.plugin.api.module.file.ModuleFileEvent;

class TsConfigCacheTest {

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Mock
  private BridgeServerImpl bridgeServerMock;
  private TsConfigCacheImpl tsConfigCache;

  @TempDir
  Path baseDir;

  @TempDir
  File tempDir;

  TempFolder tempFolder;

  @BeforeEach
  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);
    when(bridgeServerMock.isAlive()).thenReturn(true);
    when(bridgeServerMock.getCommandInfo()).thenReturn("bridgeServerMock command info");
    tsConfigCache = new TsConfigCacheImpl(bridgeServerMock);
    tempFolder = new DefaultTempFolder(tempDir, true);
  }

  @Test
  void test() throws Exception {
    List<String> files = Arrays.asList("dir1/file1.ts", "dir2/file2.ts", "dir3/file3.ts");


    List<InputFile> inputFiles = files
      .stream()
      .map(f -> TestInputFileBuilder.create("foo", f).build())
      .collect(Collectors.toList());

    List<TsConfigFile> tsConfigFiles = Arrays.asList(
      new TsConfigFile(absolutePath(baseDir, "dir1/tsconfig.json"), singletonList(inputFiles.get(0).absolutePath()), emptyList()),
      new TsConfigFile(absolutePath(baseDir, "dir2/tsconfig.json"), singletonList(inputFiles.get(1).absolutePath()), emptyList()),
      new TsConfigFile(absolutePath(baseDir, "dir3/tsconfig.json"), singletonList(inputFiles.get(2).absolutePath()), emptyList())
    );

    for (var tsConfigFile : tsConfigFiles) {
      Path tsConfigPath = baseDir.resolve(tsConfigFile.getFilename());
      Files.createDirectory(tsConfigPath.getParent());
      Files.createFile(tsConfigPath);
    }
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), null, this::tsConfigFileCreator, tsConfigCache);

    when(bridgeServerMock.loadTsConfig(any()))
      .thenAnswer(invocationOnMock -> {
        String tsConfigPath = (String) invocationOnMock.getArguments()[0];
        return tsConfigFiles.stream().filter(tsConfigFile -> tsConfigPath.endsWith(tsConfigFile.getFilename())).findFirst().get();
      });

    for (var i = 0; i < files.size(); i++) {
      var tsConfigFile = tsConfigCache.getTsConfigForInputFile(inputFiles.get(i));
      assertThat(tsConfigFile).isEqualTo(tsConfigFiles.get(i));
    }
  }

  @Test
  void failsToLoad() throws Exception {
    assertThat(tsConfigCache.getTsConfigForInputFile(TestInputFileBuilder.create("foo", "file1.ts").build())).isNull();
  }

  @Test
  void getters() {
    var file = new TsConfigFile("dir1/tsconfig.json", singletonList("foo/dir1/file1.ts"), emptyList());
    assertThat(file.getFilename()).isEqualTo("dir1/tsconfig.json");
    assertThat(file.getProjectReferences()).isEmpty();
    assertThat(file).hasToString("dir1/tsconfig.json");
  }

  @Test
  void testClearCacheOnTsConfigChange() throws Exception {
    var file1 = TestInputFileBuilder.create(baseDir.toString(), "file1.ts").build();
    var tsConfigInputFile = TestInputFileBuilder.create(baseDir.toString(), "tsconfig.json").build();
    var tsConfigFile = new TsConfigFile("tsconfig.json", singletonList(file1.absolutePath()), emptyList());
    Path tsconfig1 = baseDir.resolve("tsconfig.json");
    Files.createFile(tsconfig1);

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), null, this::tsConfigFileCreator, tsConfigCache);

    when(bridgeServerMock.loadTsConfig(any())).thenReturn(tsConfigFile);
    var foundTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(foundTsConfig.getFilename()).isEqualTo(tsConfigFile.getFilename());

    var fileEvent = DefaultModuleFileEvent.of(tsConfigInputFile, ModuleFileEvent.Type.MODIFIED);
    tsConfigCache.process(fileEvent);
    var newTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(newTsConfig).isNull();
  }

  @Test
  void testDoesNotClearCacheOnIrrelevantFile() throws Exception {
    var file1 = TestInputFileBuilder.create(baseDir.toString(), "file1.ts").setLanguage("js").build();
    var tsConfigFile = new TsConfigFile("tsconfig.json", singletonList(file1.absolutePath()), emptyList());
    Path tsconfig1 = baseDir.resolve("tsconfig.json");
    Files.createFile(tsconfig1);

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), null, this::tsConfigFileCreator, tsConfigCache);
    when(bridgeServerMock.loadTsConfig(any())).thenReturn(tsConfigFile);

    var foundTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(foundTsConfig.getFilename()).isEqualTo(tsConfigFile.getFilename());

    var fileEvent = DefaultModuleFileEvent.of(file1, ModuleFileEvent.Type.CREATED);
    tsConfigCache.process(fileEvent);
    var newTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(newTsConfig.getFilename()).isEqualTo(tsConfigFile.getFilename());
  }

  String tsConfigFileCreator(String content) throws IOException {
    var path = tempFolder.newFile().toPath();
    Files.writeString(path, content);
    return path.toString();
  }

  private String absolutePath(Path baseDir, String relativePath) {
    return new File(baseDir.toFile(), relativePath).getAbsolutePath();
  }
}
