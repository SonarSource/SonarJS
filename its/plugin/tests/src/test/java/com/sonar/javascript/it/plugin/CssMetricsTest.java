/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2023 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasure;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasureAsDouble;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(OrchestratorStarter.class)
class CssMetricsTest {

  private static final String PROJECT_KEY = "css-metrics-project";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @BeforeAll
  public static void prepare() {
    orchestrator.executeBuild(CssTestsUtils.createScanner(PROJECT_KEY));
  }

  @Test
  void test() {
    assertThat(getMeasureAsDouble(PROJECT_KEY, "lines")).isEqualTo(89);
    assertThat(getMeasureAsDouble(PROJECT_KEY, "ncloc")).isEqualTo(52);
    assertThat(getMeasure(PROJECT_KEY, "ncloc_language_distribution").getValue())
      .isEqualTo("css=27;php=1;web=24");
    assertThat(getMeasureAsDouble(PROJECT_KEY, "comment_lines")).isEqualTo(6);

    assertThat(getMeasure(PROJECT_KEY + ":src/file1.css", "ncloc_data").getValue())
      .contains("1=1;", "2=1;", "3=1;", "4=1;", "5=1;", "6=1;", "7=1");

    assertThat(getMeasure(PROJECT_KEY + ":src/file2.less", "ncloc_data").getValue())
      .contains("1=1;", "2=1;", "3=1;", "4=1;", "5=1;", "6=1;", "7=1;", "8=1;", "9=1");

    assertThat(getMeasure(PROJECT_KEY + ":src/file3.scss", "ncloc_data").getValue())
      .contains("1=1;", "3=1;", "5=1;", "6=1;", "7=1;", "8=1");

    assertThat(getMeasure(PROJECT_KEY + ":src/file4.sass", "ncloc_data").getValue())
      .contains("1=1", "3=1", "5=1", "6=1", "7=1");

    assertThat(getMeasure(PROJECT_KEY + ":src/file5.html", "ncloc_data").getValue())
      .contains("1=1", "2=1", "3=1", "4=1", "5=1", "6=1", "7=1", "8=1", "9=1", "10=1");

    // .htm is not part of sonar-HTML languages. When it is, an assertion should be added for file6.htm
    // https://sonarsource.atlassian.net/jira/software/c/projects/SONARHTML/issues/SONARHTML-180

    assertThat(getMeasure(PROJECT_KEY + ":src/file7.xhtml", "ncloc_data").getValue())
      .contains(
        "1=1",
        "2=1",
        "4=1",
        "5=1",
        "6=1",
        "7=1",
        "8=1",
        "9=1",
        "10=1",
        "11=1",
        "12=1",
        "13=1",
        "14=1",
        "15=1"
      );
  }
}
