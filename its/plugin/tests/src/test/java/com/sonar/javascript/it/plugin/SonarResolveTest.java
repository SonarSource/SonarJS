/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package com.sonar.javascript.it.plugin;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;

@ExtendWith(OrchestratorStarter.class)
class SonarResolveTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @Test
  void should_persist_sonar_resolve_from_embedded_javascript_in_html() {
    String projectKey = "sonar-resolve-html";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir(projectKey));

    OrchestratorStarter.setProfiles(
      projectKey,
      Map.of("html-profile", "web", "nosonar-profile", "js")
    );
    enableIssueResolution(projectKey);
    orchestrator.executeBuild(build);

    String fileKey = projectKey + ":index.html";

    assertThat(searchIssues(fileKey))
      .singleElement()
      .satisfies(issue -> {
        assertThat(issue.getRule()).isEqualTo("javascript:S1116");
        assertThat(issue.getLine()).isEqualTo(5);
        assertThat(issue.getIssueStatus()).isEqualTo("ACCEPTED");
        assertThat(issue.hasResolution()).isTrue();
        assertThat(issue.getResolution()).isNotBlank();
        assertThat(issue.hasComments()).isTrue();
        assertThat(issue.getComments().getCommentsList()).anySatisfy(comment ->
          assertThat(comment.getMarkdown()).contains("accepted in HTML")
        );
      });
  }

  private static void enableIssueResolution(String projectKey) {
    orchestrator
      .getServer()
      .post(
        "api/settings/set",
        Map.of("key", "sonar.issues.issueResolution.global.enabled", "value", "true")
      );
    orchestrator
      .getServer()
      .post(
        "api/settings/set",
        Map.of(
          "component",
          projectKey,
          "key",
          "sonar.issues.issueResolution.enabled",
          "value",
          "true"
        )
      );
  }

  private static List<Issue> searchIssues(String componentKey) {
    SearchRequest request = new SearchRequest()
      .setComponentKeys(List.of(componentKey))
      .setAdditionalFields(List.of("_all"))
      .setRules(List.of("javascript:S1116"));
    return OrchestratorStarter.newWsClient(orchestrator).issues().search(request).getIssuesList();
  }
}
