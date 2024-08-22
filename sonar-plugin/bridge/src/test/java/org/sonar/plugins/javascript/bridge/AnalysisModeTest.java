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
package org.sonar.plugins.javascript.bridge;

import static java.util.Collections.emptyList;
import static java.util.function.Function.identity;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.function.Function;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.rule.ActiveRule;
import org.sonar.api.batch.rule.ActiveRules;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;

class AnalysisModeTest {

  SensorContext context = mock(SensorContext.class);

  @Test
  void should_list_unchanged_file_rules() {
    var rules = rules("key1", "key2", "ucfg");
    Assertions.assertThat(AnalysisMode.getUnchangedFileRules(rules))
      .hasSize(1)
      .extracting(EslintRule::toString)
      .contains("ucfg");
  }

  @Test
  void should_reflect_non_skippable_analysis() {
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 4)));
    when(context.canSkipUnchangedFiles()).thenReturn(false);

    var mode = AnalysisMode.getMode(context);
    assertThat(mode).isEqualTo(AnalysisMode.DEFAULT);
    verify(context).canSkipUnchangedFiles();
  }

  @Test
  void should_reflect_skippable_without_security_analysis() {
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 4)));
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    when(context.activeRules()).thenReturn(mock(ActiveRules.class));

    var mode = AnalysisMode.getMode(context);
    assertThat(mode).isEqualTo(AnalysisMode.DEFAULT);
    verify(context).canSkipUnchangedFiles();

    var files = fileList(changedFiles(2), unchangedFiles(1), addedFiles(3));
    assertThat(
      files.stream().map(mode::getLinterIdFor).allMatch(AnalysisMode.DEFAULT_LINTER_ID::equals)
    )
      .isTrue();
  }

  @Test
  void should_reflect_main_branch_analysis() {
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 4)));
    when(context.canSkipUnchangedFiles()).thenReturn(false);

    var mode = AnalysisMode.getMode(context);
    assertThat(mode).isEqualTo(AnalysisMode.DEFAULT);
    verify(context).canSkipUnchangedFiles();

    var files = fileList(changedFiles(2), unchangedFiles(1), addedFiles(3));
    assertThat(
      files.stream().map(mode::getLinterIdFor).allMatch(AnalysisMode.DEFAULT_LINTER_ID::equals)
    )
      .isTrue();
  }

  @Test
  void should_reflect_pr_analysis() {
    when(context.runtime()).thenReturn(SonarRuntimeImpl.forSonarLint(Version.create(9, 4)));
    when(context.canSkipUnchangedFiles()).thenReturn(true);
    ActiveRules activeRules = mock(ActiveRules.class);
    when(activeRules.findByRepository("jssecurity")).thenReturn(List.of(mock(ActiveRule.class)));
    when(context.activeRules()).thenReturn(activeRules);

    var mode = AnalysisMode.getMode(context);
    assertThat(mode).isEqualTo(AnalysisMode.SKIP_UNCHANGED);
    verify(context).canSkipUnchangedFiles();

    var files = fileList(changedFiles(2), unchangedFiles(1), addedFiles(3));
    assertThat(files.stream().map(mode::getLinterIdFor))
      .containsExactly(
        AnalysisMode.DEFAULT_LINTER_ID,
        AnalysisMode.DEFAULT_LINTER_ID,
        AnalysisMode.UNCHANGED_LINTER_ID,
        AnalysisMode.DEFAULT_LINTER_ID,
        AnalysisMode.DEFAULT_LINTER_ID,
        AnalysisMode.DEFAULT_LINTER_ID
      );
  }

  @Test
  void should_filter_out_rules_for_html() {
    var rules = rules("key1", "key2", "ucfg", "no-var");
    var filteredRules = AnalysisMode.getHtmlFileRules(rules);
    assertThat(filteredRules)
      .hasSize(2)
      .extracting(EslintRule::getKey)
      .containsExactlyInAnyOrder("key1", "key2");
  }

  private static List<EslintRule> rules(String... keys) {
    return Arrays
      .stream(keys)
      .map(key -> new EslintRule(key, emptyList(), emptyList(), "js"))
      .toList();
  }


  @SafeVarargs
  private static List<InputFile> fileList(Stream<InputFile>... streams) {
    return Arrays.stream(streams).flatMap(identity()).toList();
  }

  private static Stream<InputFile> changedFiles(int count) {
    return files(count, AnalysisModeTest::changedFile);
  }

  private static Stream<InputFile> unchangedFiles(int count) {
    return files(count, AnalysisModeTest::unchangedFile);
  }

  private static Stream<InputFile> addedFiles(int count) {
    return files(count, AnalysisModeTest::addedFile);
  }

  private static Stream<InputFile> files(int count, Function<String, InputFile> factory) {
    return IntStream.range(0, count).mapToObj(i -> String.format("file-%d.js", i + 1)).map(factory);
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
