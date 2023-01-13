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
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.client.issues.SearchRequest;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.newWsClient;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@ExtendWith(OrchestratorStarter.class)
class ProjectWithDifferentEncodingTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @Test
  void test() {
    String projectKey = "project-with-different-encoding";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-16")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir(projectKey));

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "js");
    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.getLogs()).doesNotContain("Failure during analysis");

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3923"));
    List<Issues.Issue> issuesList = newWsClient(orchestrator).issues().search(request).getIssuesList();
    assertThat(issuesList).extracting(Issues.Issue::getLine, Issues.Issue::getComponent, Issues.Issue::getRule)
      .containsExactly(tuple(2, projectKey + ":fileWithUtf16.js", "javascript:S3923"));
  }

}
