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
import org.junit.jupiter.api.parallel.ResourceLock;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.client.issues.SearchRequest;

@ExtendWith(OrchestratorStarter.class)
@ResourceLock("issue-resolution-settings")
class EslintSuppressedIssuesTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;
  private static final String RULE_KEY = "javascript:S3504";
  private static final String FALLBACK_COMMENT = "Accepted via ESLint directive";
  private static final String ISSUE_RESOLUTION_GLOBAL_ENABLED =
    "sonar.issues.issueResolution.global.enabled";
  private static final String ISSUE_RESOLUTION_ENABLED = "sonar.issues.issueResolution.enabled";

  @Test
  void should_persist_eslint_suppressed_issues_as_accepted() {
    String projectKey = "eslint-suppressed-issues";

    OrchestratorStarter.setProfile(projectKey, "suppressed-issues-profile", "js");
    setIssueResolution(projectKey, true);
    orchestrator.executeBuild(scanner(projectKey));

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

  @Test
  void should_not_create_eslint_suppressed_issues_with_default_issue_resolution_settings() {
    String projectKey = "eslint-suppressed-issues-defaults";

    OrchestratorStarter.setProfile(projectKey, "suppressed-issues-profile", "js");
    resetIssueResolution(projectKey);
    orchestrator.executeBuild(scanner(projectKey));

    assertOnlyOpenUnsuppressedIssue(projectKey);
  }

  @Test
  void should_not_create_eslint_suppressed_issues_when_global_flag_is_disabled() {
    String projectKey = "eslint-suppressed-issues-global-disabled";

    OrchestratorStarter.setProfile(projectKey, "suppressed-issues-profile", "js");
    resetIssueResolution(projectKey);
    orchestrator.executeBuild(scanner(projectKey).setProperty(ISSUE_RESOLUTION_ENABLED, "true"));

    assertOnlyOpenUnsuppressedIssue(projectKey);
  }

  @Test
  void should_not_create_eslint_suppressed_issues_when_project_flag_is_disabled() {
    String projectKey = "eslint-suppressed-issues-project-disabled";

    OrchestratorStarter.setProfile(projectKey, "suppressed-issues-profile", "js");
    setIssueResolution(projectKey, false);
    orchestrator.executeBuild(scanner(projectKey));

    assertOnlyOpenUnsuppressedIssue(projectKey);
  }

  private static void assertAcceptedIssue(Issues.Issue issue, String commentText) {
    assertThat(issue).isNotNull();
    assertThat(issue.getIssueStatus()).isEqualTo("ACCEPTED");
    assertThat(issue.hasResolution()).isTrue();
    assertThat(issue.getResolution()).isNotBlank();
    assertThat(issue.getComments().getCommentsList()).anySatisfy(comment ->
      assertThat(comment.getMarkdown()).contains(commentText)
    );
  }

  private static void assertOpenIssue(Issues.Issue issue) {
    assertThat(issue).isNotNull();
    assertThat(issue.getIssueStatus()).isEqualTo("OPEN");
    assertThat(issue.hasResolution()).isFalse();
    assertThat(issue.getComments().getCommentsList()).isEmpty();
  }

  private static void assertOnlyOpenUnsuppressedIssue(String projectKey) {
    assertThat(searchIssues(projectKey + ":file.js"))
      .singleElement()
      .satisfies(issue -> {
        assertThat(issue.getLine()).isEqualTo(9);
        assertOpenIssue(issue);
      });
  }

  private static SonarScanner scanner(String projectKey) {
    return getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("eslint-suppressed-issues"));
  }

  private static void setIssueResolution(String projectKey, boolean projectEnabled) {
    setGlobalIssueResolution(true);
    setProjectIssueResolution(projectKey, projectEnabled);
  }

  private static void setGlobalIssueResolution(boolean enabled) {
    orchestrator
      .getServer()
      .post(
        "api/settings/set",
        Map.of("key", ISSUE_RESOLUTION_GLOBAL_ENABLED, "value", Boolean.toString(enabled))
      );
  }

  private static void setProjectIssueResolution(String projectKey, boolean enabled) {
    orchestrator
      .getServer()
      .post(
        "api/settings/set",
        Map.of(
          "component",
          projectKey,
          "key",
          ISSUE_RESOLUTION_ENABLED,
          "value",
          Boolean.toString(enabled)
        )
      );
  }

  private static void resetIssueResolution(String projectKey) {
    orchestrator
      .getServer()
      .post("api/settings/reset", Map.of("keys", ISSUE_RESOLUTION_GLOBAL_ENABLED));
    orchestrator
      .getServer()
      .post(
        "api/settings/reset",
        Map.of("component", projectKey, "keys", ISSUE_RESOLUTION_ENABLED)
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
