/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.sonar.wsclient.services.Measure;
import org.sonar.wsclient.services.Resource;
import org.sonar.wsclient.services.ResourceQuery;

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

    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(7);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(1);
    assertThat(getProjectMeasure("conditions_to_cover").getValue()).isEqualTo(4);
    assertThat(getProjectMeasure("uncovered_conditions").getValue()).isEqualTo(1);
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

    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(7);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(1);
    assertThat(getProjectMeasure("conditions_to_cover").getValue()).isEqualTo(4);
    assertThat(getProjectMeasure("uncovered_conditions").getValue()).isEqualTo(1);
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
      assertThat(getProjectMeasure("it_lines_to_cover").getValue()).isEqualTo(7);
      assertThat(getProjectMeasure("it_uncovered_lines").getValue()).isEqualTo(1);
      assertThat(getProjectMeasure("it_conditions_to_cover").getValue()).isEqualTo(4);
      assertThat(getProjectMeasure("it_uncovered_conditions").getValue()).isEqualTo(1);

    } else {
      assertThat(getProjectMeasure("it_lines_to_cover")).isNull();
      assertThat(getProjectMeasure("it_uncovered_lines")).isNull();
      assertThat(getProjectMeasure("it_conditions_to_cover")).isNull();
      assertThat(getProjectMeasure("it_uncovered_conditions")).isNull();
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
      assertThat(getProjectMeasure("overall_lines_to_cover").getValue()).isEqualTo(7);
      assertThat(getProjectMeasure("overall_uncovered_lines").getValue()).isEqualTo(1);
      assertThat(getProjectMeasure("overall_conditions_to_cover").getValue()).isEqualTo(4);
      assertThat(getProjectMeasure("overall_uncovered_conditions").getValue()).isEqualTo(1);

    } else {
      assertThat(getProjectMeasure("overall_lines_to_cover")).isNull();
      assertThat(getProjectMeasure("overall_uncovered_lines")).isNull();
      assertThat(getProjectMeasure("overall_conditions_to_cover")).isNull();
      assertThat(getProjectMeasure("overall_uncovered_conditions")).isNull();
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
      assertThat(getProjectMeasure("lines_to_cover")).isNull();
      assertThat(getProjectMeasure("uncovered_lines")).isNull();
      assertThat(getProjectMeasure("conditions_to_cover")).isNull();
      assertThat(getProjectMeasure("uncovered_conditions")).isNull();

    } else {
      assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(7);
      assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(1);
      assertThat(getProjectMeasure("conditions_to_cover").getValue()).isEqualTo(4);
      assertThat(getProjectMeasure("uncovered_conditions").getValue()).isEqualTo(1);
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

    // NOTE that lines_to_cover is 10 here (instead of 7 in other tests) because this value is equal to NCLOC metric (computed on plugin side)
    // which counts every line containing code even if it's not executable (e.g. containing just "}").
    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(10);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(10);
    assertThat(getProjectMeasure("conditions_to_cover")).isNull();
    assertThat(getProjectMeasure("uncovered_conditions")).isNull();
    assertThat(getFileMeasure("coverage_line_hits_data").getData()).startsWith("1=0;2=0;3=0;5=0");

    assertThat(getProjectMeasure("it_conditions_to_cover")).isNull();
    assertThat(getProjectMeasure("it_uncovered_conditions")).isNull();

    String propertyRemoveMessage = "Since SonarQube 6.2 property 'sonar.javascript.forceZeroCoverage' is removed and its value is not used during analysis";

    if (is_before_sonar_6_2()) {
      assertThat(getProjectMeasure("it_lines_to_cover").getValue()).isEqualTo(10);
      assertThat(getProjectMeasure("it_uncovered_lines").getValue()).isEqualTo(10);
      assertThat(getFileMeasure("it_coverage_line_hits_data").getData()).startsWith("1=0;2=0;3=0;5=0");
      assertThat(result.getLogs()).doesNotContain(propertyRemoveMessage);

    } else {
      assertThat(result.getLogs()).contains(propertyRemoveMessage);
      assertThat(getProjectMeasure("it_lines_to_cover")).isNull();
      assertThat(getProjectMeasure("it_uncovered_lines")).isNull();
      assertThat(getFileMeasure("it_coverage_line_hits_data")).isNull();
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
      assertThat(getProjectMeasure("lines_to_cover")).isNull();
      assertThat(getProjectMeasure("uncovered_lines")).isNull();
    } else {
      assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(10);
      assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(10);
    }

    assertThat(getProjectMeasure("conditions_to_cover")).isNull();
    assertThat(getProjectMeasure("uncovered_conditions")).isNull();
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

    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(6);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(1);
    assertThat(getProjectMeasure("conditions_to_cover").getValue()).isEqualTo(3);
    assertThat(getProjectMeasure("uncovered_conditions").getValue()).isEqualTo(0);
  }

  private Measure getProjectMeasure(String metricKey) {
    Resource resource = orchestrator.getServer().getWsClient().find(ResourceQuery.createForMetrics("project", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private Measure getFileMeasure(String metricKey) {
    Resource resource = orchestrator.getServer().getWsClient().find(ResourceQuery.createForMetrics("project:file.js", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

}
