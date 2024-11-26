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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.newWsClient;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.client.issues.SearchRequest;

@ExtendWith(OrchestratorStarter.class)
class NoSonarTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("nosonar");

  @BeforeAll
  public static void startServer() {
    String projectKey = "nosonar-project";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setProjectName(projectKey)
      .setProjectVersion("1")
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    OrchestratorStarter.setProfile(projectKey, "nosonar-profile", "js");

    orchestrator.executeBuild(build);
  }

  @Test
  void test() {
    SearchRequest request = new SearchRequest();
    request
      .setComponentKeys(singletonList("nosonar-project"))
      .setSeverities(singletonList("INFO"))
      .setRules(singletonList("javascript:S1116"));
    assertThat(newWsClient(orchestrator).issues().search(request).getIssuesList()).hasSize(1);
  }
}
