/*
 * Copyright (C) 2012-2014 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
 */
package com.sonar.javascript.it.plugin;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarRunner;
import static org.fest.assertions.Assertions.assertThat;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.Sonar;
import org.sonar.wsclient.services.Measure;
import org.sonar.wsclient.services.Resource;
import org.sonar.wsclient.services.ResourceQuery;

import java.util.regex.Pattern;

public class UnitTestTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;


  @Before
  public void clean() {
    orchestrator.resetData();
  }

  @Test
  public void jstestdriver_report_path_can_be_relative() {
    orchestrator.executeBuild(createBuildWithReport("reports/jstestdriver"));

    // Projct Level
    if (Tests.is_strictly_after_plugin("2.7")) {
      assertThat(getProjectMeasure("tests").getValue()).isEqualTo(4.0);
      assertThat(getProjectMeasure("test_execution_time").getValue()).isEqualTo(1400.0);
    } else {
      assertThat(getProjectMeasure("tests").getValue()).isEqualTo(2.0);
      assertThat(getProjectMeasure("test_execution_time").getValue()).isEqualTo(700.0);
    }
    assertThat(getProjectMeasure("skipped_tests").getValue()).isEqualTo(0.0);
    assertThat(getProjectMeasure("test_errors").getValue()).isEqualTo(0.0);
    assertThat(getProjectMeasure("test_success_density").getValue()).isEqualTo(100.0);

    // File Level
    assertThat(getFileMeasure("tests", orchestrator.getServer().getWsClient()).getValue()).isEqualTo(2.0);
  }

  @Test
  public void jstestdriver_report_path_can_be_absolute() {
    orchestrator.executeBuild(createBuildWithReport(TestUtils.file("projects/unittest/reports/jstestdriver").getAbsolutePath()));

    if (Tests.is_strictly_after_plugin("2.7")) {
      assertThat(getProjectMeasure("tests").getValue()).isEqualTo(4.0);
      assertThat(getProjectMeasure("test_execution_time").getValue()).isEqualTo(1400.0);
    } else {
      assertThat(getProjectMeasure("tests").getValue()).isEqualTo(2.0);
      assertThat(getProjectMeasure("test_execution_time").getValue()).isEqualTo(700.0);
    }
    assertThat(getProjectMeasure("skipped_tests").getValue()).isEqualTo(0.0);
    assertThat(getProjectMeasure("test_errors").getValue()).isEqualTo(0.0);
    assertThat(getProjectMeasure("test_success_density").getValue()).isEqualTo(100.0);

    assertThat(getFileMeasure("tests", orchestrator.getServer().getWsClient()).getValue()).isEqualTo(2.0);
  }

  @Test
  // SONARJS-303, SONARJS-304
  public void jestestdriver_report_with_unknown_classname() {
    BuildResult result = orchestrator.executeBuild(
      createBuildWithReport(TestUtils.file("projects/unittest/reports/jstestdriver-unknown-file").getAbsolutePath()));

    // Check that no measure has been saved
    assertThat(getProjectMeasure("tests")).isNull();
    assertThat(getProjectMeasure("skipped_tests")).isNull();
    assertThat(getProjectMeasure("test_errors")).isNull();
    assertThat(getProjectMeasure("test_execution_time")).isNull();
    assertThat(getProjectMeasure("test_success_density")).isNull();

    assertThat(getFileMeasure("tests", orchestrator.getServer().getWsClient())).isNull();

    // Check that a log is printed
    Pattern pattern = Pattern.compile("Test result will not be saved for test class \"unknown\", because SonarQube associated resource has not been found using file name: \"unknown.js\"");
    assertThat(pattern.matcher(result.getLogs()).find()).isTrue();
  }

  private Measure getProjectMeasure(String metricKey) {
    Resource resource = orchestrator.getServer().getWsClient().find(ResourceQuery.createForMetrics("project", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private Measure getFileMeasure(String metricKey, Sonar wsClient) {
    Resource resource = wsClient.find(ResourceQuery.createForMetrics(keyFor("person/PersonTest.js"), metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

  private static String keyFor(String s) {
    return "project:" + (orchestrator.getConfiguration().getSonarVersion().isGreaterThanOrEquals("4.2") ? "test/" : "") + s;
  }

  private static SonarRunner createBuildWithReport(String reportPath) {
    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("unittest"))
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1.0")
      .setSourceDirs("main")
      .setTestDirs("test")
      .setProperty("sonar.javascript.jstestdriver.reportsPath", reportPath).setDebugLogs(true);

    if (!Tests.is_strictly_after_plugin("2.7")) {
      build.setProperty("sonar.test.exclusions", "**/Another-PersonTest.js");
    }

    return build;
  }

}
