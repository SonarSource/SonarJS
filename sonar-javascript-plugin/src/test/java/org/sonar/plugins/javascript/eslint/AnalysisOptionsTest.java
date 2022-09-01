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

import java.util.Arrays;
import java.util.List;
import java.util.function.Function;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;

import static java.util.Collections.emptyList;
import static java.util.function.Function.identity;
import static java.util.stream.Collectors.toList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnalysisOptionsTest {

  @Mock
  SensorContext context;
  private AutoCloseable mocks;

  @BeforeEach
  void openMocks() {
    mocks = MockitoAnnotations.openMocks(this);
  }

  @AfterEach()
  void closeMocks() throws Exception {
    mocks.close();
  }

  @Test
  void should_reflect_non_skippable_analysis() {
    when(context.canSkipUnchangedFiles()).thenReturn(false);
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 4)));

    var analysisOptions = new AnalysisOptions(context, rules("key1", "key2"));
    assertThat(analysisOptions.isUnchangedAnalysisEnabled()).isFalse();
    assertThat(analysisOptions.getFilesToAnalyzeIn(emptyList())).isEmpty();
    assertThat(analysisOptions.getFilesToAnalyzeIn(changedFileList(2))).hasSize(2);

    var files = fileList(changedFiles(2), unchangedFiles(1), addedFiles(3));
    assertThat(analysisOptions.getFilesToAnalyzeIn(files)).hasSize(6);
    for (var file : files) {
      assertThat(analysisOptions.getLinterIdFor(file)).isEqualTo("default");
    }
  }

  private static List<EslintRule> rules(String... keys) {
    return Arrays.stream(keys).map(key -> new EslintRule(key, emptyList(), emptyList())).collect(toList());
  }

  private static List<InputFile> changedFileList(int count) {
    return fileList(changedFiles(count));
  }

  @SafeVarargs
  private static List<InputFile> fileList(Stream<InputFile>... streams) {
    return Arrays.stream(streams).flatMap(identity()).collect(toList());
  }

  private static Stream<InputFile> changedFiles(int count) {
    return files(count, AnalysisOptionsTest::changedFile);
  }

  private static Stream<InputFile> unchangedFiles(int count) {
    return files(count, AnalysisOptionsTest::unchangedFile);
  }

  private static Stream<InputFile> addedFiles(int count) {
    return files(count, AnalysisOptionsTest::addedFile);
  }

  private static Stream<InputFile> files(int count, Function<String, InputFile> factory) {
    return IntStream.range(0, count)
      .mapToObj(i -> String.format("file-%d.js", i + 1))
      .map(factory);
  }

  private static InputFile changedFile(String filename) {
    return file("changed-" + filename, InputFile.Status.CHANGED);
  }

  private static InputFile addedFile(String filename) {
    return file("added-" + filename, InputFile.Status.ADDED);
  }

  private static InputFile unchangedFile(String filename) {
    return file("unchanged-" + filename, InputFile.Status.SAME);
  }

  private static InputFile file(String filename, InputFile.Status status) {
    InputFile mock = mock(InputFile.class);
    when(mock.filename()).thenReturn(filename);
    when(mock.status()).thenReturn(status);
    return mock;
  }

}
