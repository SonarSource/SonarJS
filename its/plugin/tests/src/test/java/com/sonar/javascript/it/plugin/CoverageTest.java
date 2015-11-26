/*
 * SonarSource :: JavaScript :: ITs :: Plugin :: Tests
 * Copyright (C) 2012 SonarSource
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package com.sonar.javascript.it.plugin;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarRunner;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.services.Measure;
import org.sonar.wsclient.services.Resource;
import org.sonar.wsclient.services.ResourceQuery;

import java.util.regex.Pattern;

import static org.fest.assertions.Assertions.assertThat;

public class CoverageTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @Before
  public void clean() {
    orchestrator.resetData();
  }

  @Test
  public void LCOV_path_can_be_relative() throws Exception {
    SonarRunner build = Tests.createSonarRunnerBuild()
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
    SonarRunner build = Tests.createSonarRunnerBuild()
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
    if (Tests.is_strictly_after_plugin("2.5")) {
      SonarRunner build = Tests.createSonarRunnerBuild()
        .setProjectDir(TestUtils.projectDir("lcov"))
          .setProjectKey(Tests.PROJECT_KEY)
          .setProjectName(Tests.PROJECT_KEY)
          .setProjectVersion("1.0")
          .setSourceDirs(".")
          .setProperty("sonar.javascript.lcov.itReportPath", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
      Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
      orchestrator.executeBuild(build);

      assertThat(getProjectMeasure("it_lines_to_cover").getValue()).isEqualTo(7);
      assertThat(getProjectMeasure("it_uncovered_lines").getValue()).isEqualTo(1);
      assertThat(getProjectMeasure("it_conditions_to_cover").getValue()).isEqualTo(4);
      assertThat(getProjectMeasure("it_uncovered_conditions").getValue()).isEqualTo(1);
    }
  }

  @Test
  public void force_zero_coverage() {
    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.forceZeroCoverage", "true");

    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    // NOTE that lines_to_cover is 10 here (instead of 7 in other tests) because this value is equal to NCLOC metric (computed on plugin side)
    // which counts every line containing code even if it's not executable (e.g. containing just "}").
    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(10);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(10);
    assertThat(getProjectMeasure("it_lines_to_cover").getValue()).isEqualTo(10);
    assertThat(getProjectMeasure("it_uncovered_lines").getValue()).isEqualTo(10);
    if (Tests.is_strictly_after_plugin("2.4")) {
      assertThat(getFileMeasure("coverage_line_hits_data").getData()).startsWith("1=0;2=0;3=0;5=0");
      assertThat(getFileMeasure("it_coverage_line_hits_data").getData()).startsWith("1=0;2=0;3=0;5=0");
    }
    assertThat(getProjectMeasure("conditions_to_cover")).isNull();
    assertThat(getProjectMeasure("it_conditions_to_cover")).isNull();
    assertThat(getProjectMeasure("uncovered_conditions")).isNull();
    assertThat(getProjectMeasure("it_uncovered_conditions")).isNull();
  }

  @Test
  public void no_coverage_information_saved() {
    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".");
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasure("lines_to_cover")).isNull();
    assertThat(getProjectMeasure("uncovered_lines")).isNull();
    assertThat(getProjectMeasure("conditions_to_cover")).isNull();
    assertThat(getProjectMeasure("uncovered_conditions")).isNull();
  }

  @Test
  // SONARJS-301
  public void print_log_for_not_found_resource() throws InterruptedException {
    SonarRunner build = Tests.createSonarRunnerBuild()
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
    assertThat(Pattern.compile("Default value of zero will be saved for file: .*file\\.js").matcher(logs).find()).isTrue();
    assertThat(Pattern.compile("WARN.*Could not resolve 1 file paths in coverage-wrong-file-name\\.lcov, "
      + "first unresolved path: \\./wrong/fileName\\.js").matcher(logs).find()).isTrue();
  }

  @Test
  // SONARJS-547
  public void wrong_line_in_report() throws InterruptedException {
    SonarRunner build = Tests.createSonarRunnerBuild()
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
