/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2017 SonarSource SA
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
import org.sonarqube.ws.WsMeasures.Measure;

import static com.sonar.javascript.it.plugin.Tests.getMeasure;
import static com.sonar.javascript.it.plugin.Tests.getMeasureAsInt;
import static com.sonar.javascript.it.plugin.Tests.is_before_sonar_6_2;
import static org.assertj.core.api.Assertions.assertThat;

public class CoverageTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @Before
  public void clean() {
    orchestrator.resetData();
  }

  @Test
  public void LCOV_path_can_be_relative() throws Exception {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPath", "coverage.lcov");
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
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
      .setProperty("sonar.javascript.lcov.reportPath", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(4);
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(1);
  }

  @Test
  public void LCOV_it_coverage() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.itReportPath", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    if (is_before_sonar_6_2()) {
      assertThat(getProjectMeasureAsInt("it_lines_to_cover")).isEqualTo(7);
      assertThat(getProjectMeasureAsInt("it_uncovered_lines")).isEqualTo(1);
      assertThat(getProjectMeasureAsInt("it_conditions_to_cover")).isEqualTo(4);
      assertThat(getProjectMeasureAsInt("it_uncovered_conditions")).isEqualTo(1);

    } else {
      assertThat(getProjectMeasureAsInt("it_lines_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("it_uncovered_lines")).isNull();
      assertThat(getProjectMeasureAsInt("it_conditions_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("it_uncovered_conditions")).isNull();
    }
  }

  @Test
  public void LCOV_overall_coverage() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPath", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath())
      .setProperty("sonar.javascript.lcov.itReportPath", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    if (is_before_sonar_6_2()) {
      assertThat(getProjectMeasureAsInt("overall_lines_to_cover")).isEqualTo(7);
      assertThat(getProjectMeasureAsInt("overall_uncovered_lines")).isEqualTo(1);
      assertThat(getProjectMeasureAsInt("overall_conditions_to_cover")).isEqualTo(4);
      assertThat(getProjectMeasureAsInt("overall_uncovered_conditions")).isEqualTo(1);

    } else {
      assertThat(getProjectMeasureAsInt("overall_lines_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("overall_uncovered_lines")).isNull();
      assertThat(getProjectMeasureAsInt("overall_conditions_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("overall_uncovered_conditions")).isNull();
    }
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
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    if (is_before_sonar_6_2()) {
      // property is ignored
      assertThat(getProjectMeasureAsInt("lines_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("uncovered_lines")).isNull();
      assertThat(getProjectMeasureAsInt("conditions_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("uncovered_conditions")).isNull();

    } else {
      assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
      assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
      assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(4);
      assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(1);
    }
  }

  @Test
  public void force_zero_coverage() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.forceZeroCoverage", "true");

    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    BuildResult result = orchestrator.executeBuild(build);

    if (is_before_sonar_6_2()) {
      // NOTE that lines_to_cover is 10 here (instead of 7 in other tests) because this value is equal to NCLOC metric (computed on plugin
      // side)
      // which counts every line containing code even if it's not executable (e.g. containing just "}").
      assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(10);
      assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(10);
      assertThat(getFileMeasure("coverage_line_hits_data").getValue()).startsWith("1=0;2=0;3=0;5=0");
    } else {
      assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
      assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(7);
      assertThat(getFileMeasure("coverage_line_hits_data").getValue()).startsWith("1=0;2=0;5=0;6=0");

    }
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isNull();
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isNull();

    assertThat(getProjectMeasureAsInt("it_conditions_to_cover")).isNull();
    assertThat(getProjectMeasureAsInt("it_uncovered_conditions")).isNull();

    String propertyRemoveMessage = "Since SonarQube 6.2 property 'sonar.javascript.forceZeroCoverage' is removed and its value is not used during analysis";

    if (is_before_sonar_6_2()) {
      assertThat(getProjectMeasureAsInt("it_lines_to_cover")).isEqualTo(10);
      assertThat(getProjectMeasureAsInt("it_uncovered_lines")).isEqualTo(10);
      assertThat(getFileMeasure("it_coverage_line_hits_data").getValue()).startsWith("1=0;2=0;3=0;5=0");
      assertThat(result.getLogs()).doesNotContain(propertyRemoveMessage);

    } else {
      assertThat(result.getLogs()).contains(propertyRemoveMessage);
      assertThat(getProjectMeasureAsInt("it_lines_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("it_uncovered_lines")).isNull();
      assertThat(getFileMeasureAsInt("it_coverage_line_hits_data")).isNull();
    }
  }

  @Test
  public void no_coverage_information_saved() {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".");
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    if (is_before_sonar_6_2()) {
      assertThat(getProjectMeasureAsInt("lines_to_cover")).isNull();
      assertThat(getProjectMeasureAsInt("uncovered_lines")).isNull();
    } else {
      assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(7);
      assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(7);
    }

    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isNull();
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isNull();
  }

  @Test
  // SONARJS-301
  public void print_log_for_not_found_resource() throws InterruptedException {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPath", TestUtils.file("projects/lcov/coverage-wrong-file-name.lcov").getAbsolutePath())
      .setDebugLogs(true);
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    BuildResult result = orchestrator.executeBuild(build);

    // Check that a log is printed
    String logs = result.getLogs();
    assertThat(Pattern.compile("Analysing .*coverage-wrong-file-name\\.lcov").matcher(logs).find()).isTrue();
    assertThat(Pattern.compile("WARN.*Could not resolve 1 file paths in \\[.*coverage-wrong-file-name\\.lcov\\], "
      + "first unresolved path: \\./wrong/fileName\\.js").matcher(logs).find()).isTrue();

    boolean saveZeroMessage = Pattern.compile("Default value of zero will be saved for file: .*file\\.js").matcher(logs).find();

    if (is_before_sonar_6_2()) {
      assertThat(saveZeroMessage).isTrue();
    } else {
      assertThat(saveZeroMessage).isFalse();
    }
  }

  @Test
  // SONARJS-547
  public void wrong_line_in_report() throws InterruptedException {
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPath", TestUtils.file("projects/lcov/coverage-wrong-line.lcov").getAbsolutePath());
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    BuildResult result = orchestrator.executeBuild(build);

    // Check that a log is printed
    String logs = result.getLogs();
    assertThat(Pattern.compile("WARN  - Problem during processing LCOV report: can't save DA data for line 999.").matcher(logs).find()).isTrue();
    assertThat(Pattern.compile("WARN  - Problem during processing LCOV report: can't save BRDA data for line 0.").matcher(logs).find()).isTrue();

    assertThat(getProjectMeasureAsInt("lines_to_cover")).isEqualTo(6);
    assertThat(getProjectMeasureAsInt("uncovered_lines")).isEqualTo(1);
    assertThat(getProjectMeasureAsInt("conditions_to_cover")).isEqualTo(3);
    assertThat(getProjectMeasureAsInt("uncovered_conditions")).isEqualTo(0);
  }

  private Integer getProjectMeasureAsInt(String metricKey) {
    return getMeasureAsInt("project", metricKey);
  }

  private Integer getFileMeasureAsInt(String metricKey) {
    return getMeasureAsInt("project:file.js", metricKey);
  }

  private Measure getFileMeasure(String metricKey) {
    return getMeasure("project:file.js", metricKey);
  }

}
