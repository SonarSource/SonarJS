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
import java.io.File;
import java.util.List;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.CustomRulesTest.initOrchestrator;
import static com.sonar.javascript.it.plugin.CustomRulesTest.runBuild;
import static org.assertj.core.api.Assertions.assertThat;

public class EslintCustomRulesTest {
  private static final String PLUGIN_ARTIFACT_ID = "eslint-custom-rules-plugin";

  private static Orchestrator orchestrator;

  @BeforeClass
  public static void before() {
    orchestrator = initOrchestrator(PLUGIN_ARTIFACT_ID);
  }


  @AfterClass
  public static void after() {
    orchestrator.stop();
  }

  @Test
  public void test() {
    BuildResult buildResult = runBuild(orchestrator);
    assertThat(buildResult.getLogsLines(l -> l.matches(".*INFO: Deploying custom rules bundle jar:file:.*/custom-eslint-based-rules-1\\.0\\.0\\.tgz to .*"))).hasSize(1);
    List<Issues.Issue> issues = CustomRulesTest.findIssues("eslint-custom-rules:sqKey", orchestrator);
    assertThat(issues).hasSize(1);
    Issues.Issue issue = issues.get(0);
    assertThat(issue.getRule()).isEqualTo("eslint-custom-rules:sqKey");
    assertThat(issue.getLine()).isEqualTo(21);
    assertThat(issue.getMessage()).isEqualTo("call");
    Issues.Location secondaryLocation = issue.getFlows(0).getLocations(0);
    assertThat(secondaryLocation.getMsg()).isEqualTo(new File(TestUtils.projectDir("custom_rules"), ".scannerwork").getAbsolutePath());
  }

}
