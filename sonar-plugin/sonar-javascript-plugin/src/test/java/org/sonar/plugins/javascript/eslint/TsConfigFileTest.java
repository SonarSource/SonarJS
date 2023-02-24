/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.utils.log.LogTesterJUnit5;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

class TsConfigFileTest {

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @Test
  void test() {
    List<String> files = Arrays.asList("dir1/file1.ts", "dir2/file2.ts", "dir3/file3.ts");
    List<InputFile> inputFiles = files.stream().map(f -> TestInputFileBuilder.create("foo", f).build()).collect(Collectors.toList());

    List<TsConfigFile> tsConfigFiles = Arrays.asList(
      new TsConfigFile("dir1/tsconfig.json", singletonList("foo/dir1/file1.ts"), emptyList()),
      new TsConfigFile("dir2/tsconfig.json", singletonList("foo/dir2/file2.ts"), emptyList()),
      new TsConfigFile("dir3/tsconfig.json", singletonList("foo/dir3/file3.ts"), emptyList())
    );

    Map<TsConfigFile, List<InputFile>> result = TsConfigFile.inputFilesByTsConfig(tsConfigFiles, inputFiles);
    assertThat(result).containsExactly(
      entry(tsConfigFiles.get(0), singletonList(inputFiles.get(0))),
      entry(tsConfigFiles.get(1), singletonList(inputFiles.get(1))),
      entry(tsConfigFiles.get(2), singletonList(inputFiles.get(2)))
    );
  }

  @Test
  void failsToLoad() {
    List<TsConfigFile> tsConfigFiles = singletonList(new TsConfigFile("tsconfig/path", emptyList(), emptyList()));
    Map<TsConfigFile, List<InputFile>> result = TsConfigFile.inputFilesByTsConfig(tsConfigFiles, emptyList());
    assertThat(result).isEmpty();
  }
}
