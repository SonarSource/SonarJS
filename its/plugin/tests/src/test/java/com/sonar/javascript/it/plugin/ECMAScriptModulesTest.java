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
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues;

@ExtendWith(OrchestratorStarter.class)
class ECMAScriptModulesTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("esm-project");

  @Test
  void test() {
    String projectKey = "esm-project";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "js");
    orchestrator.executeBuild(build);

    List<Issues.Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(2);
  }
}
