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
import com.sonar.orchestrator.build.SonarRunner;
import com.sonar.orchestrator.locator.FileLocation;
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
      .setProjectDir(FileLocation.of("../../sources/src").getFile())
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs(".")
      // FIXME after full migration of the grammar: was 424m before migration (and with Java 6)
      .setEnvironmentVariable("SONAR_RUNNER_OPTS", "-Xmx2500m");

    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    wsClient = orchestrator.getServer().getWsClient();
  }

  @Test
  public void project_level() {
    // Size
    assertThat(getProjectMeasure("ncloc").getIntValue()).isEqualTo(662106);
    // SONAR-5077: computation of line is done on SQ side
    assertThat(getProjectMeasure("lines").getIntValue()).isEqualTo(1178445);
    assertThat(getProjectMeasure("files").getIntValue()).isEqualTo(4535);
    assertThat(getProjectMeasure("directories").getIntValue()).isEqualTo(977);
    assertThat(getProjectMeasure("functions").getIntValue()).isEqualTo(54166);
    assertThat(getProjectMeasure("statements").getIntValue()).isEqualTo(327171);

    // Documentation
    assertThat(getProjectMeasure("comment_lines").getIntValue()).isEqualTo(309230);
    assertThat(getProjectMeasure("commented_out_code_lines")).isNull();
    assertThat(getProjectMeasure("comment_lines_density").getValue()).isEqualTo(31.8);

    // Complexity
    // Since ES6 support
    assertThat(getProjectMeasure("complexity").getValue()).isEqualTo(179409.0);
    assertThat(getProjectMeasure("function_complexity_distribution").getData())
      .isEqualTo("1=21282;2=13956;4=6624;6=3602;8=2065;10=1328;12=2349;20=1051;30=1909");

    // SONARJS-299
    assertThat(getProjectMeasure("function_complexity").getValue()).isEqualTo(7.0);
    assertThat(getProjectMeasure("file_complexity").getValue()).isEqualTo(40.8);
    assertThat(getProjectMeasure("file_complexity_distribution").getData())
      .isEqualTo("0=2091;5=304;10=457;20=372;30=500;60=271;90=403");

    // Duplication
    // SONAR-7026
    assertThat(getProjectMeasure("duplicated_lines").getValue()).isEqualTo(341151.0);
    assertThat(getProjectMeasure("duplicated_blocks").getValue()).isEqualTo(14722.0);
    assertThat(getProjectMeasure("duplicated_lines_density").getValue()).isEqualTo(28.9);
    assertThat(getProjectMeasure("duplicated_files").getValue()).isEqualTo(837.0);
  }

  private Measure getProjectMeasure(String metricKey) {
    Resource resource = wsClient.find(ResourceQuery.createForMetrics("project", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }

}
