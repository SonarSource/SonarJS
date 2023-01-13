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

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasureAsInt;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OrchestratorStarter.class)
class CoverageTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @Test
  void LCOV_path_can_be_relative() {
    final String projectKey = "LcovPathCanBeRelative";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.exclusions", "dir/**")
      .setProperty("sonar.javascript.lcov.reportPaths", "coverage.lcov");
    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(7);
    assertThat(getMeasureAsInt(projectKey, "uncovered_lines")).isEqualTo(1);
    assertThat(getMeasureAsInt(projectKey, "conditions_to_cover")).isEqualTo(4);
    assertThat(getMeasureAsInt(projectKey, "uncovered_conditions")).isEqualTo(1);
  }

  @Test
  void LCOV_path_can_be_absolute() {
    final String projectKey = "LcovPathCanBeAbsolute";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.exclusions", "dir/**")
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(7);
    assertThat(getMeasureAsInt(projectKey, "uncovered_lines")).isEqualTo(1);
    assertThat(getMeasureAsInt(projectKey, "conditions_to_cover")).isEqualTo(4);
    assertThat(getMeasureAsInt(projectKey, "uncovered_conditions")).isEqualTo(1);
  }

  @Test
  void LCOV_report_paths() {
    final String projectKey = "LcovReportPaths";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.exclusions", "dir/**")
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(7);
    assertThat(getMeasureAsInt(projectKey, "uncovered_lines")).isEqualTo(1);
    assertThat(getMeasureAsInt(projectKey, "conditions_to_cover")).isEqualTo(4);
    assertThat(getMeasureAsInt(projectKey, "uncovered_conditions")).isEqualTo(1);
  }

  @Test
  void LCOV_report_paths_alias() {
    final String projectKey = "LcovReportPathsAlias";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.exclusions", "dir/**")
      .setProperty("sonar.typescript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(7);
  }

  @Test
  void zero_coverage() {
    final String projectKey = "ZeroCoverage";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setProperty("sonar.exclusions", "dir/**")
      .setSourceDirs(".");

    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(5);
    assertThat(getMeasureAsInt(projectKey, "uncovered_lines")).isEqualTo(5);

    assertThat(getMeasureAsInt(projectKey, "conditions_to_cover")).isNull();
    assertThat(getMeasureAsInt(projectKey, "uncovered_conditions")).isNull();
  }

  @Test
  // SONARJS-301
  public void print_log_for_not_found_resource() {
    final String projectKey = "PrintLogForNotFoundResource";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage-wrong-file-name.lcov").getAbsolutePath())
      .setDebugLogs(true);
    OrchestratorStarter.setEmptyProfile(projectKey);
    BuildResult result = orchestrator.executeBuild(build);

    // Check that a log is printed
    assertThat(result.getLogs())
      .containsPattern(Pattern.compile("Analysing .*coverage-wrong-file-name\\.lcov"))
      .containsPattern(Pattern.compile("WARN.*Could not resolve 1 file paths in \\[.*coverage-wrong-file-name\\.lcov\\]"))
      .containsPattern(Pattern.compile("DEBUG: Unresolved paths:\n\\./wrong/fileName\\.js"));
  }

  @Test
  // SONARJS-547
  void wrong_line_in_report() {
    final String projectKey = "WrongLineInReport";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProperty("sonar.exclusions", "dir/**")
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov/coverage-wrong-line.lcov").getAbsolutePath());
    OrchestratorStarter.setEmptyProfile(projectKey);
    BuildResult result = orchestrator.executeBuild(build);

    // Check that a log is printed
    assertThat(result.getLogs())
      .contains("DEBUG: Problem during processing LCOV report: can't save DA data for line 12 of coverage report file")
      .contains("DEBUG: Problem during processing LCOV report: can't save BRDA data for line 18 of coverage report file");

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(7);
    assertThat(getMeasureAsInt(projectKey, "uncovered_lines")).isEqualTo(1);
    assertThat(getMeasureAsInt(projectKey, "conditions_to_cover")).isEqualTo(3);
    assertThat(getMeasureAsInt(projectKey, "uncovered_conditions")).isEqualTo(0);
  }

  @Test
  void conditions_on_non_executable_lines() {
    final String projectKey = "ConditionsOnNonExecutableLines";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov-jsx"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProperty("sonar.javascript.lcov.reportPaths", TestUtils.file("projects/lcov-jsx/conditions-on-non-executable-lines.lcov").getAbsolutePath());
    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(3);
    assertThat(getMeasureAsInt(projectKey, "uncovered_lines")).isEqualTo(0);
    assertThat(getMeasureAsInt(projectKey, "conditions_to_cover")).isEqualTo(2);
    assertThat(getMeasureAsInt(projectKey, "uncovered_conditions")).isEqualTo(1);
  }

  @Test
  void wildcard_LCOV_report_paths() {
    final String projectKey = "LcovWildcardReportPaths";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov-wildcard"))
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPaths", "foo.lcov,bar/*.lcov,**/qux/*.lcov");
    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey + ":foo.js", "uncovered_lines")).isEqualTo(1);
    assertThat(getMeasureAsInt(projectKey + ":bar/bar.js", "uncovered_lines")).isEqualTo(1);
    assertThat(getMeasureAsInt(projectKey + ":baz/baz.js", "uncovered_lines")).isEqualTo(5);
    assertThat(getMeasureAsInt(projectKey + ":baz/qux/qux.js", "uncovered_lines")).isEqualTo(1);
  }

  @Test
  void LCOV_report_outside_module() {
    final String projectKey = "LcovReportOutsideModule";
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProperty("sonar.modules", "dir")
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.exclusions", "**")
      .setProperty("dir.sonar.exclusions", "")
      .setProperty("dir.sonar.projectBaseDir", "dir")
      .setProperty("dir.sonar.javascript.lcov.reportPaths", "../coverage.lcov");
    OrchestratorStarter.setEmptyProfile(projectKey);
    orchestrator.executeBuild(build);

    assertThat(getMeasureAsInt(projectKey, "lines_to_cover")).isEqualTo(7);
    assertThat(getMeasureAsInt(projectKey, "uncovered_lines")).isEqualTo(1);
    assertThat(getMeasureAsInt(projectKey, "conditions_to_cover")).isEqualTo(4);
    assertThat(getMeasureAsInt(projectKey, "uncovered_conditions")).isEqualTo(1);
  }
}
