/*
 * SonarQube JavaScript Plugin
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

public class MinifiedFilesTest {

  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static Sonar wsClient;

  @BeforeClass
  public static void prepare() {
    orchestrator.resetData();

    SonarRunner build = Tests.createSonarRunnerBuild()
      .setProjectDir(TestUtils.projectDir("minified_files"))
      .setProjectKey(Tests.PROJECT_KEY)
      .setProjectName(Tests.PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs("src");
    Tests.setEmptyProfile(Tests.PROJECT_KEY, Tests.PROJECT_KEY);
    orchestrator.executeBuild(build);

    wsClient = orchestrator.getServer().getWsClient();
  }

  @Test
  public void test() throws Exception {
    assertThat(getProjectMeasure("files").getIntValue()).isEqualTo(3);
    assertThat(getProjectMeasure("functions").getIntValue()).isEqualTo(2);
    assertThat(getProjectMeasure("statements").getIntValue()).isEqualTo(1);
  }

  /* Helper methods */

  private Measure getProjectMeasure(String metricKey) {
    Resource resource = wsClient.find(ResourceQuery.createForMetrics("project", metricKey));
    return resource == null ? null : resource.getMeasure(metricKey);
  }
}
