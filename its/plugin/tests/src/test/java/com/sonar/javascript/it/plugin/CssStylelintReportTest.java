/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.newWsClient;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;

@ExtendWith(OrchestratorStarter.class)
class CssStylelintReportTest {

  private static final String PROJECT_KEY = "css-external-report-project";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @BeforeAll
  public static void prepare() {
    orchestrator.executeBuild(
      CssTestsUtils
        .createScanner(PROJECT_KEY)
        .setProperty("sonar.css.stylelint.reportPaths", "report.json")
    );
  }

  @Test
  void test() {
    if (orchestrator.getServer().version().isGreaterThanOrEquals(7, 2)) {
      SearchRequest request = new SearchRequest();
      request.setComponentKeys(Collections.singletonList(PROJECT_KEY));
      List<Issue> issuesList = newWsClient(orchestrator).issues().search(request).getIssuesList();

      assertThat(issuesList).extracting("line").containsExactlyInAnyOrder(111, 81, 55, 58, 58, 114);
      assertThat(issuesList)
        .extracting("rule")
        .containsExactlyInAnyOrder(
          "external_stylelint:no-missing-end-of-source-newline",
          "external_stylelint:no-missing-end-of-source-newline",
          "external_stylelint:rule-empty-line-before",
          "external_stylelint:selector-pseudo-element-colon-notation",
          "css:S4658",
          "external_stylelint:block-no-empty"
        );
    }
  }
}
