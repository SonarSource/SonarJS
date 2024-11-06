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
import static org.sonar.plugins.javascript.analysis.TsConfigProvider.TSCONFIG_PATHS;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.TempFolder;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonar.plugins.javascript.sonarlint.TsConfigCacheImpl;
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
  public void setUp() {
    MockitoAnnotations.openMocks(this);
    tsConfigCache = new TsConfigCacheImpl(bridgeServerMock);
    tempFolder = new DefaultTempFolder(tempDir, true);
  }

  @Test
  void test() throws Exception {
    List<String> files = Arrays.asList("dir1/file1.ts", "dir2/file2.ts", "dir3/file3.ts");


    List<InputFile> inputFiles = files
      .stream()
      .map(f -> TestInputFileBuilder.create("moduleKey", baseDir.toFile(), baseDir.resolve(f).toFile()).build())
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
    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), this::tsConfigFileCreator, tsConfigCache);

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
  void failsToLoad() {
    assertThat(tsConfigCache.getTsConfigForInputFile(TestInputFileBuilder.create("foo", "file1.ts").setLanguage(TypeScriptLanguage.KEY).build())).isNull();
  }

  @Test
  void testOriginalTsConfigListIsCached() throws IOException {
    var fileAndTsConfig = prepareFileAndTsConfig();
    var file1 = fileAndTsConfig.getLeft();
    var tsConfigFile = fileAndTsConfig.getRight();
    tsConfigCache.getTsConfigForInputFile(file1);
    var cachedTsConfigs = tsConfigCache.listCachedTsConfigs(TsConfigOrigin.LOOKUP);
    assertThat(cachedTsConfigs).containsExactly(tsConfigFile.getFilename());
  }

  @Test
  void testClearCacheOnTsConfigChange() throws IOException {
    var fileAndTsConfig = prepareFileAndTsConfig();
    var file1 = fileAndTsConfig.getLeft();
    var tsConfigFile = fileAndTsConfig.getRight();
    var tsConfigInputFile = TestInputFileBuilder.create(baseDir.toString(), "tsconfig.json").build();

    var foundTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(foundTsConfig.getFilename()).isEqualTo(tsConfigFile.getFilename());

    var fileEvent = DefaultModuleFileEvent.of(tsConfigInputFile, ModuleFileEvent.Type.MODIFIED);
    tsConfigCache.process(fileEvent);
    var newTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(newTsConfig).isNull();
  }

  @Test
  void testResolvesReferences() throws IOException {
    var file1 = TestInputFileBuilder.create(baseDir.toString(), "file1.ts").setLanguage(TypeScriptLanguage.KEY).build();
    Path tsconfig1 = baseDir.resolve("tsconfig.json");
    Path tsconfig2 = baseDir.resolve("tsconfig2.json");
    var tsConfigFile1 = new TsConfigFile(tsconfig1.toAbsolutePath().toString(), emptyList(), singletonList(tsconfig2.toAbsolutePath().toString()));
    var tsConfigFile2 = new TsConfigFile(tsconfig2.toAbsolutePath().toString(), singletonList(file1.absolutePath()), emptyList());
    Files.createFile(tsconfig1);
    Files.createFile(tsconfig2);

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), this::tsConfigFileCreator, tsConfigCache);
    when(bridgeServerMock.loadTsConfig(any())).thenAnswer(invocationOnMock -> {
      String tsConfigPath = (String) invocationOnMock.getArguments()[0];
      if (tsConfigPath.equals(tsConfigFile1.getFilename())) {
        return tsConfigFile1;
      } else {
        return tsConfigFile2;
      }
    });
    var foundTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(foundTsConfig.getFilename()).isEqualTo(tsConfigFile2.getFilename());
  }

  @ParameterizedTest
  @EnumSource(ModuleFileEvent.Type.class)
  void testResolvesTsConfigsOnProjectFileChanges(ModuleFileEvent.Type operationType) throws IOException {
    var fileAndTsConfig = prepareFileAndTsConfig();
    var file1 = fileAndTsConfig.getLeft();
    var tsConfigFile = fileAndTsConfig.getRight();

    var foundTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(foundTsConfig.getFilename()).isEqualTo(tsConfigFile.getFilename());

    var fileEvent = DefaultModuleFileEvent.of(file1, operationType);
    tsConfigCache.process(fileEvent);

    var cachedOriginalTsConfigsList = tsConfigCache.listCachedTsConfigs(TsConfigOrigin.LOOKUP);
    assertThat(cachedOriginalTsConfigsList).containsExactly(tsConfigFile.getFilename());

    var newTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(newTsConfig.getFilename()).isEqualTo(tsConfigFile.getFilename());
  }

  @Test
  void testPropertyTsConfigChanged() throws IOException {
    var file1 = TestInputFileBuilder.create(baseDir.toString(), "file1.ts").setLanguage(TypeScriptLanguage.KEY).build();
    Path tsconfig1 = baseDir.resolve("tsconfig.json");
    Files.createFile(tsconfig1);
    var tsConfigFile = new TsConfigFile(tsconfig1.toAbsolutePath().toString(), singletonList(file1.absolutePath()), emptyList());
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.setSettings(
      new MapSettings()
        .setProperty(
          TSCONFIG_PATHS,
          "tsconfig.*.json,tsconfig.json"
        )
    );
    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), this::tsConfigFileCreator, tsConfigCache);
    when(bridgeServerMock.loadTsConfig(any())).thenReturn(tsConfigFile);

    var foundTsConfig = tsConfigCache.getTsConfigForInputFile(file1);
    assertThat(foundTsConfig.getFilename()).isEqualTo(tsConfigFile.getFilename());

    Path tsconfig2 = baseDir.resolve("tsconfig.app.json");
    var tsConfigInputFile = TestInputFileBuilder.create(baseDir.toString(), "tsconfig.app.json").build();
    Files.createFile(tsconfig2);
    var fileEvent = DefaultModuleFileEvent.of(tsConfigInputFile, ModuleFileEvent.Type.CREATED);
    tsConfigCache.process(fileEvent);
    var propertyCachedTsConfig = tsConfigCache.listCachedTsConfigs(TsConfigOrigin.PROPERTY);
    assertThat(propertyCachedTsConfig).containsExactly(tsconfig1.toAbsolutePath().toString());

    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), this::tsConfigFileCreator, tsConfigCache);
    propertyCachedTsConfig = tsConfigCache.listCachedTsConfigs(TsConfigOrigin.PROPERTY);
    assertThat(propertyCachedTsConfig).containsExactlyInAnyOrder(tsconfig1.toAbsolutePath().toString(), tsconfig2.toAbsolutePath().toString());
  }

  private Pair<InputFile, TsConfigFile> prepareFileAndTsConfig() throws IOException {
    var file1 = TestInputFileBuilder.create(baseDir.toString(), "file1.ts").setLanguage(TypeScriptLanguage.KEY).build();
    Path tsconfig1 = baseDir.resolve("tsconfig.json");
    var tsConfigFile = new TsConfigFile(tsconfig1.toAbsolutePath().toString(), singletonList(file1.absolutePath()), emptyList());
    Files.createFile(tsconfig1);

    SensorContextTester ctx = SensorContextTester.create(baseDir);
    TsConfigProvider.getTsConfigs(new ContextUtils(ctx), this::tsConfigFileCreator, tsConfigCache);
    when(bridgeServerMock.loadTsConfig(any())).thenReturn(tsConfigFile);
    return Pair.of(file1, tsConfigFile);
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
