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
import com.sonar.orchestrator.build.SonarRunner;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.wsclient.Sonar;
import org.sonar.wsclient.services.Measure;
import org.sonar.wsclient.services.Resource;
import org.sonar.wsclient.services.ResourceQuery;

import static org.fest.assertions.Assertions.assertThat;

public class BigProjectTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static Sonar wsClient;

  @BeforeClass
  public static void prepare() {
    orchestrator.resetData();

    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(orchestrator.getFileLocationOfShared("src").getFile())
      .setProjectKey("project")
      .setProjectName("project")
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      // FIXME after full migration of the grammar: was 424m before migration (and with Java 6)
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx2500m");
    orchestrator.executeBuild(build);

    wsClient = orchestrator.getServer().getWsClient();
  }

  @Test
  public void project_level() {
    // Size
    assertThat(getProjectMeasure("ncloc").getIntValue()).isEqualTo(663658);
    // SONAR-5077: computation of line is done on SQ side
    if (Tests.is_after_sonar_5_1()) {
      assertThat(getProjectMeasure("lines").getIntValue()).isEqualTo(1178445);
    } else {
      // Metric computed by the JavaScript plugin:
      // different because does not compute lines metric when there is parse errors in a file.
      assertThat(getProjectMeasure("lines").getIntValue()).isEqualTo(1177778);
    }
    assertThat(getProjectMeasure("files").getIntValue()).isEqualTo(4535);
    assertThat(getProjectMeasure("directories").getIntValue()).isEqualTo(977);
    assertThat(getProjectMeasure("functions").getIntValue()).isEqualTo(54183);
    assertThat(getProjectMeasure("statements").getIntValue()).isEqualTo(328212);

    // Documentation
    assertThat(getProjectMeasure("comment_lines").getIntValue()).isEqualTo(309246);
    assertThat(getProjectMeasure("commented_out_code_lines")).isNull();
    assertThat(getProjectMeasure("comment_lines_density").getValue()).isEqualTo(31.8);

    // Complexity
    // Since ES6 support
    assertThat(getProjectMeasure("complexity").getValue()).isEqualTo(179426.0);
    assertThat(getProjectMeasure("function_complexity_distribution").getData())
      .isEqualTo("1=21324;2=13942;4=6617;6=3602;8=2065;10=1325;12=2348;20=1053;30=1907");

    // SONARJS-299
    assertThat(getProjectMeasure("function_complexity").getValue()).isEqualTo(7.0);
    assertThat(getProjectMeasure("file_complexity").getValue()).isEqualTo(39.6);
    assertThat(getProjectMeasure("file_complexity_distribution").getData())
      .isEqualTo("0=2227;5=304;10=457;20=372;30=500;60=271;90=403");

    // Duplication
    // SONAR-3752
    // FIXME Godin: different values on my Mac and in Jenkins:
    assertThat(getProjectMeasure("duplicated_lines").getValue()).isIn(347644.0, 347380.0);
    assertThat(getProjectMeasure("duplicated_blocks").getValue()).isIn(42250.0, 42178.0);
    assertThat(getProjectMeasure("duplicated_files").getValue()).isEqualTo(872.0);
    assertThat(getProjectMeasure("duplicated_lines_density").getValue()).isEqualTo(29.5);
  }

  private Measure getProjectMeasure(String metricKey) {
    Resource resource = wsClient.find(ResourceQuery.createForMetrics("project", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

}
