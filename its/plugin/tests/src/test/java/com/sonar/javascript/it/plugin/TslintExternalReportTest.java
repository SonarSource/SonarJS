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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

@ExtendWith(OrchestratorStarter.class)
class TslintExternalReportTest {

  private static final String PROJECT_KEY = "SonarJS-tslint-report-test";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @Test
  void should_save_issues_from_external_report() {
    OrchestratorStarter.setEmptyProfile(PROJECT_KEY);

    SonarScanner build = OrchestratorStarter
      .createScanner()
      .setProjectDir(TestUtils.projectDir("tslint-report-project"))
      .setProjectKey(PROJECT_KEY)
      .setProjectName(PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs("src");

    build.setProperty("sonar.typescript.tslint.reportPaths", "report.json");
    orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(PROJECT_KEY);
    assertThat(issuesList).extracting("line").containsExactlyInAnyOrder(3, 5, 5, 7);
    assertThat(issuesList)
      .extracting("rule")
      .containsExactlyInAnyOrder(
        "external_tslint_repo:no-unused-expression",
        "external_tslint_repo:prefer-const",
        "external_tslint_repo:semicolon",
        "external_tslint_repo:curly"
      );
  }
}
