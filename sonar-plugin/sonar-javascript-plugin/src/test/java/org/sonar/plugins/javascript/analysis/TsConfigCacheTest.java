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

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.bridge.BridgeServerImpl;
import org.sonar.plugins.javascript.bridge.TsConfigFile;

class TsConfigCacheTest {

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Mock
  private BridgeServerImpl bridgeServerMock;
  private TsConfigCache tsConfigCache;

  @TempDir
  Path baseDir;

  public void setUp() throws Exception {
    MockitoAnnotations.initMocks(this);
    when(bridgeServerMock.isAlive()).thenReturn(true);
    when(bridgeServerMock.getCommandInfo()).thenReturn("bridgeServerMock command info");
    tsConfigCache = new TsConfigCacheImpl(bridgeServerMock);
  }
  @Test
  void test() throws Exception {
    setUp();

    List<String> files = Arrays.asList("dir1/file1.ts", "dir2/file2.ts", "dir3/file3.ts");
    List<InputFile> inputFiles = files
      .stream()
      .map(f -> TestInputFileBuilder.create("foo", f).build())
      .collect(Collectors.toList());

    List<TsConfigFile> tsConfigFiles = Arrays.asList(
      new TsConfigFile("dir1/tsconfig.json", singletonList("foo/dir1/file1.ts"), emptyList()),
      new TsConfigFile("dir2/tsconfig.json", singletonList("foo/dir2/file2.ts"), emptyList()),
      new TsConfigFile("dir3/tsconfig.json", singletonList("foo/dir3/file3.ts"), emptyList())
    );

    for (var tsConfigFile : tsConfigFiles) {
      Path tsConfigPath = baseDir.resolve(tsConfigFile.getFilename());
      Files.createDirectory(tsConfigPath.getParent());
      Files.createFile(tsConfigPath);
    }
    SensorContextTester context = SensorContextTester.create(baseDir);
    tsConfigCache.tsconfigs(context);

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
    setUp();
    assertThat(tsConfigCache.getTsConfigForInputFile(TestInputFileBuilder.create("foo", "file1.ts").build())).isNull();
  }

  @Test
  void getters() {
    var file = new TsConfigFile("dir1/tsconfig.json", singletonList("foo/dir1/file1.ts"), emptyList());
    assertThat(file.getFilename()).isEqualTo("dir1/tsconfig.json");
    assertThat(file.getProjectReferences()).isEmpty();
    assertThat(file).hasToString("dir1/tsconfig.json");
  }
}
