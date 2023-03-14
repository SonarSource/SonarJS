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

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.eslint.NodeDeprecationWarning.MIN_RECOMMENDED_NODE_VERSION;
import static org.sonar.plugins.javascript.eslint.NodeDeprecationWarning.MIN_SUPPORTED_NODE_VERSION;
import static org.sonar.plugins.javascript.eslint.NodeDeprecationWarning.REMOVAL_DATE;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.api.utils.log.LoggerLevel;

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
  void test_14() {
    deprecationWarning.logNodeDeprecation(14);
    assertWarnings(
      "Using Node.js version 14 to execute analysis is deprecated and will stop being supported no earlier than May 1st, 2023. " +
      "Please upgrade to a newer LTS version of Node.js [16, 18]"
    );
  }

  @Test
  void test_recommended() {
    deprecationWarning.logNodeDeprecation(16);
    deprecationWarning.logNodeDeprecation(18);
    assertWarnings();
  }

  @Test
  void test_15() {
    deprecationWarning.logNodeDeprecation(15);
    assertWarnings(
      "Using Node.js version 15 to execute analysis is deprecated and will stop being supported no earlier than May 1st, 2023. Please upgrade to a newer LTS version of Node.js [16, 18]",
      "Node.js version 15 is not recommended, you might experience issues. Please use a recommended version of Node.js [16, 18]"
    );
  }

  @Test
  void test_17() {
    deprecationWarning.logNodeDeprecation(17);
    assertWarnings(
      "Node.js version 17 is not recommended, you might experience issues. Please use a recommended version of Node.js [16, 18]"
    );
  }

  @Test
  void test_all_removal_dates_defined() {
    var allRemovalDates = IntStream
      .range(MIN_SUPPORTED_NODE_VERSION.major(), MIN_RECOMMENDED_NODE_VERSION)
      .allMatch(REMOVAL_DATE::containsKey);
    assertThat(allRemovalDates).isTrue();
  }

  private void assertWarnings(String... messages) {
    assertThat(analysisWarnings.warnings).containsExactly(messages);
    assertThat(logTester.logs(LoggerLevel.WARN)).contains(messages);
  }
}
