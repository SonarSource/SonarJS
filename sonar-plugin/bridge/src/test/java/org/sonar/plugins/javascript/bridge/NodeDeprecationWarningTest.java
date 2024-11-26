/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.slf4j.event.Level;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;

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

  @Test
  void test_unsupported() {
    deprecationWarning.logNodeDeprecation(16);
    assertWarnings(
      "Using Node.js version 16 to execute analysis is not supported. " +
      "Please upgrade to a newer LTS version of Node.js: [^20.9.0, ^22.9.0].");
  }

  @Test
  void test_supported() {
    deprecationWarning.logNodeDeprecation(18);
    deprecationWarning.logNodeDeprecation(20);
    deprecationWarning.logNodeDeprecation(21);
    deprecationWarning.logNodeDeprecation(22);
    assertWarnings("Using Node.js version 18 to execute analysis is not supported. " +
      "Please upgrade to a newer LTS version of Node.js: [^20.9.0, ^22.9.0].");
  }

  private void assertWarnings(String... messages) {
    assertThat(analysisWarnings.warnings).containsExactly(messages);
    assertThat(logTester.logs(Level.WARN)).contains(messages);
  }
}
