/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.event.Level;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.Version;

class NodeDeprecationWarningTest {

  @RegisterExtension
  public final LogTesterJUnit5 logTester = new LogTesterJUnit5();

  static class TestAnalysisWarnings extends AnalysisWarningsWrapper {

    List<String> warnings = new ArrayList<>();

    @Override
    public void addUnique(String text) {
      warnings.add(text);
    }
  }

  TestAnalysisWarnings analysisWarnings = new TestAnalysisWarnings();
  NodeDeprecationWarning deprecationWarning = new NodeDeprecationWarning(analysisWarnings);

  /**
   * These situations should not be reachable in production. We have separate tests for unsupported
   * versions of NodeJS. Here we should only care about the deprecation warnings.
   */
  @ParameterizedTest
  @MethodSource("unsupportedNodeVersions")
  void test_unsupported(Version version) {
    deprecationWarning.logNodeDeprecation(version);
    assertWarnings(
      String.format(
        "Using Node.js version %s to execute analysis is not recommended. " +
          "Please use a supported LTS version of Node.js: %s.",
        version,
        NodeDeprecationWarning.supportedNodeVersions()
      )
    );
  }

  @ParameterizedTest
  @MethodSource("supportedNodeVersions")
  void test_supported(Version version) {
    deprecationWarning.logNodeDeprecation(version);
    assertWarnings();
  }

  static Stream<Version> supportedNodeVersions() {
    return NodeDeprecationWarning.supportedNodeVersions()
      .stream()
      .flatMap(version ->
        Stream.of(version, Version.create(version.major(), version.minor() + 1, 0))
      );
  }

  static Stream<Version> unsupportedNodeVersions() {
    var supportedVersions = NodeDeprecationWarning.supportedNodeVersions();
    int minMajor = supportedVersions.get(0).major();
    int maxMajor = supportedVersions.get(supportedVersions.size() - 1).major();

    var versionsBelowSupportedMinimums = supportedVersions
      .stream()
      .filter(version -> version.minor() > 0)
      .map(version -> Version.create(version.major(), version.minor() - 1, 0));
    var unsupportedMajors = IntStream.rangeClosed(minMajor - 1, maxMajor + 1)
      .filter(major -> supportedVersions.stream().noneMatch(version -> version.major() == major))
      .mapToObj(major -> Version.create(major, 0, 0));

    return Stream.concat(versionsBelowSupportedMinimums, unsupportedMajors).distinct();
  }

  private void assertWarnings(String... messages) {
    assertThat(analysisWarnings.warnings).containsExactly(messages);
    assertThat(logTester.logs(Level.WARN)).contains(messages);
  }

  @Test
  void loadPropertiesThrowsExceptionWhenResourceMissing() {
    ExceptionInInitializerError ex = assertThrows(ExceptionInInitializerError.class, () ->
      NodeDeprecationWarning.loadProperties("/non-existent-file.properties")
    );
    assertTrue(ex.getMessage().contains("Failed to load"));
  }
}
