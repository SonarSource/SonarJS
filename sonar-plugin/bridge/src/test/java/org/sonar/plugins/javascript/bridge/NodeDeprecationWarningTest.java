/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
  @ValueSource(strings = { "16.10.0", "18.16.0", "20.11.9", "22.10.0" })
  void test_unsupported(String version) {
    deprecationWarning.logNodeDeprecation(Version.parse(version));
    assertWarnings(
      String.format(
        "Using Node.js version %s to execute analysis is not recommended. " +
        "Please upgrade to a newer LTS version of Node.js: %s.",
        Version.parse(version),
        NodeDeprecationWarning.RECOMMENDED_NODE_VERSION
      )
    );
  }

  @ParameterizedTest
  @ValueSource(strings = { "18.20.0", "20.13.0", "22.11.0" })
  void test_supported(String version) {
    var parsedVersion = Version.parse(version);
    deprecationWarning.logNodeDeprecation(parsedVersion);
    if (parsedVersion.major() < NodeDeprecationWarning.RECOMMENDED_NODE_VERSION.major()) {
      assertWarnings(
        String.format(
          "Using Node.js version %s to execute analysis is not recommended. " +
          "Please upgrade to a newer LTS version of Node.js: %s.",
          parsedVersion,
          NodeDeprecationWarning.RECOMMENDED_NODE_VERSION
        )
      );
    }
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
