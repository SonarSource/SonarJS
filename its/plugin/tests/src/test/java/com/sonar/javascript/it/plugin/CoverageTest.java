/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2020 SonarSource SA
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

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.regex.Pattern;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Test;

import static com.sonar.javascript.it.plugin.Tests.getMeasureAsInt;
import static org.assertj.core.api.Assertions.assertThat;

public class CoverageTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @Before
  public void clean() {
    orchestrator.resetData();
  }

  @Test
  public void LCOV_path_can_be_relative() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPaths", "coverage.lcov");
    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(4);
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(1);
  }

  @Test
  public void LCOV_path_can_be_absolute() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(4);
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(1);
  }

  @Test
  public void LCOV_report_paths() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(4);
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(1);
  }

  @Test
  public void LCOV_report_paths_deprecated_key() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.typescript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    BuildResult result = orchestrator.executeBuild(build);

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(4);
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(1);

    assertThat(result.getLogs()).contains("The use of sonar.typescript.lcov.reportPaths for coverage import is deprecated, use sonar.javascript.lcov.reportPaths instead.");
  }

  @Test
  public void zero_coverage() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".");

    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(5);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(5);

    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isNull();
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isNull();
  }

  @Test
  public void no_coverage_information_saved() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".");
    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);


    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(5);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(5);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isNull();
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isNull();
  }

  @Test
  // SONARJS-301
  public void print_log_for_not_found_resource() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage-wrong-file-name.lcov").getAbsolutePath())
      .setDebugLogs(true);
    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    BuildResult result = orchestrator.executeBuild(build);

    // Check that a log is printed
    assertThat(result.getLogs())
      .containsPattern(Pattern.compile("Analysing .*coverage-wrong-file-name\\.lcov"))
      .containsPattern(Pattern.compile("WARN.*Could not resolve 1 file paths in \\[.*coverage-wrong-file-name\\.lcov\\], "
        + "first unresolved path: \\./wrong/fileName\\.js"));
  }

  @Test
  // SONARJS-547
  public void wrong_line_in_report() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage-wrong-line.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY);
    BuildResult result = orchestrator.executeBuild(build);

    // Check that a log is printed
    assertThat(result.getLogs())
      .contains("DEBUG: Problem during processing LCOV report: can't save DA data for line 12 of coverage report file")
      .contains("DEBUG: Problem during processing LCOV report: can't save BRDA data for line 18 of coverage report file");

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(6);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(3);
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(0);
  }

  private Integer getProjectMeasureAsInt(String metricKey) {
    return getMeasureAsInt("project", metricKey);
  }

}
