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
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.client.issues.SearchRequest;

@ExtendWith(OrchestratorStarter.class)
class EslintSuppressedIssuesTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;
  private static final String RULE_KEY = "javascript:S3504";
  private static final String FALLBACK_COMMENT = "Accepted via ESLint directive";

  @Test
  void should_persist_eslint_suppressed_issues_as_accepted() {
    String projectKey = "eslint-suppressed-issues";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir(projectKey));

    OrchestratorStarter.setProfile(projectKey, "suppressed-issues-profile", "js");
    enableIssueResolution(projectKey);
    orchestrator.executeBuild(build);

    String fileKey = projectKey + ":file.js";
    Map<Integer, Issues.Issue> issuesByLine = searchIssues(fileKey)
      .stream()
      .collect(Collectors.toMap(Issues.Issue::getLine, Function.identity()));

    assertThat(issuesByLine).hasSize(5);
    assertThat(issuesByLine.values()).allSatisfy(issue ->
      assertThat(issue.getRule()).isEqualTo(RULE_KEY)
    );

    assertAcceptedIssue(issuesByLine.get(2), "eslint reason");
    assertAcceptedIssue(issuesByLine.get(4), "sonar reason");
    assertAcceptedIssue(issuesByLine.get(6), FALLBACK_COMMENT);
    assertAcceptedIssue(issuesByLine.get(8), FALLBACK_COMMENT);
    assertOpenIssue(issuesByLine.get(9));
  }

  private static void assertAcceptedIssue(Issues.Issue issue, String commentText) {
    assertThat(issue).isNotNull();
    assertThat(issue.getIssueStatus()).isEqualTo("ACCEPTED");
    assertThat(issue.hasResolution()).isTrue();
    assertThat(issue.getResolution()).isNotBlank();
    assertThat(issue.hasComments()).isTrue();
    assertThat(issue.getComments().getCommentsList()).anySatisfy(comment ->
      assertThat(comment.getMarkdown()).contains(commentText)
    );
  }

  private static void assertOpenIssue(Issues.Issue issue) {
    assertThat(issue).isNotNull();
    assertThat(issue.getIssueStatus()).isEqualTo("OPEN");
    assertThat(issue.hasResolution()).isFalse();
    assertThat(issue.hasComments()).isFalse();
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

  private static List<Issues.Issue> searchIssues(String componentKey) {
    SearchRequest request = new SearchRequest()
      .setComponentKeys(List.of(componentKey))
      .setAdditionalFields(List.of("_all"))
      .setRules(List.of(RULE_KEY));
    return OrchestratorStarter.newWsClient(orchestrator).issues().search(request).getIssuesList();
  }
}
