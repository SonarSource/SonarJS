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
import static org.fest.assertions.Assertions.assertThat;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.services.Measure;
import org.sonar.wsclient.services.Resource;
import org.sonar.wsclient.services.ResourceQuery;

import java.util.regex.Pattern;

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
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPath", "coverage.lcov");
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(4);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(1);
    assertThat(getProjectMeasure("conditions_to_cover").getValue()).isEqualTo(4);
    assertThat(getProjectMeasure("uncovered_conditions").getValue()).isEqualTo(2);
  }

  @Test
  public void LCOV_path_can_be_absolute() {
    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPath", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(4);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(1);
    assertThat(getProjectMeasure("conditions_to_cover").getValue()).isEqualTo(4);
    assertThat(getProjectMeasure("uncovered_conditions").getValue()).isEqualTo(2);
  }

  @Test
  public void LCOV_it_coverage() {
    if (Tests.is_strictly_after_plugin("2.5")) {
      SonarRunner build = Tests.createSonarRunnerBuild()
        .setProjectDir(TestUtils.projectDir("lcov"))
          .setProjectKey("project")
          .setProjectName("project")
          .setProjectVersion("1.0")
          .setSourceDirs(".")
          .setProperty("sonar.javascript.lcov.itReportPath", TestUtils.file("projects/lcov/coverage.lcov").getAbsolutePath());
      orchestrator.executeBuild(build);

      assertThat(getProjectMeasure("it_lines_to_cover").getValue()).isEqualTo(4);
      assertThat(getProjectMeasure("it_uncovered_lines").getValue()).isEqualTo(1);
      assertThat(getProjectMeasure("it_conditions_to_cover").getValue()).isEqualTo(4);
      assertThat(getProjectMeasure("it_uncovered_conditions").getValue()).isEqualTo(2);
    }
  }

  @Test
  public void force_zero_coverage() {
    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey("project")
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.forceZeroCoverage", "true");
    orchestrator.executeBuild(build);

    assertThat(getProjectMeasure("lines_to_cover").getValue()).isEqualTo(4);
    assertThat(getProjectMeasure("uncovered_lines").getValue()).isEqualTo(4);
    if (Tests.is_strictly_after_plugin("2.4")) {
      assertThat(getFileMeasure("coverage_line_hits_data").getData()).isEqualTo("3=0;4=0;5=0;7=0");
    }
    assertThat(getProjectMeasure("conditions_to_cover")).isNull();
    assertThat(getProjectMeasure("uncovered_conditions")).isNull();
  }

  @Test
  public void no_coverage_information_saved() {
    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("lcov"))
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1.0")
      .setSourceDirs(".");
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
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.lcov.reportPath", TestUtils.file("projects/lcov/coverage-wrong-file-name.lcov").getAbsolutePath())
      .setDebugLogs(true);
    BuildResult result = orchestrator.executeBuild(build);

    // Check that a log is printed
    String logs = result.getLogs();
    assertThat(Pattern.compile("Analysing .*coverage-wrong-file-name\\.lcov").matcher(logs).find()).isTrue();
    assertThat(Pattern.compile("Default value of zero will be saved for file: .*file\\.js").matcher(logs).find()).isTrue();
    assertThat(Pattern.compile("INFO.*Could not resolve 1 file paths in coverage-wrong-file-name\\.lcov, "
      + "first unresolved path: \\./wrong/fileName\\.js").matcher(logs).find()).isTrue();
  }

  private Measure getProjectMeasure(String metricKey) {
    Resource resource = orchestrator.getServer().getWsClient().find(ResourceQuery.createForMetrics("project", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private Measure getFileMeasure(String metricKey) {
    Resource resource = orchestrator.getServer().getWsClient().find(ResourceQuery.createForMetrics("project:file.js", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private static String keyFor(String s) {
    return "project:" + (orchestrator.getConfiguration().getSonarVersion().isGreaterThanOrEquals("4.2") ? "src/" : "") + s;
  }

}
