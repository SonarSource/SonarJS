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
import static java.util.Collections.emptySet;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;

@ExtendWith(OrchestratorStarter.class)
class CssNonStandardPathTest {

  private static final String PROJECT_KEY = "css-dir-with-paren";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @BeforeAll
  public static void prepare() {
    var rulesConfiguration = new ProfileGenerator.RulesConfiguration();
    var profile = ProfileGenerator.generateProfile(
      orchestrator,
      "css",
      "css",
      rulesConfiguration,
      emptySet()
    );
    orchestrator.getServer().provisionProject(PROJECT_KEY, PROJECT_KEY);
    orchestrator.getServer().associateProjectToQualityProfile(PROJECT_KEY, "css", profile);

    SonarScanner scanner = getSonarScanner()
      .setSourceEncoding("UTF-8")
      .setProjectDir(TestUtils.projectDir("css-(dir with paren)"))
      .setProjectKey(PROJECT_KEY)
      .setProjectName(PROJECT_KEY)
      .setSourceDirs("src");
    orchestrator.executeBuild(scanner);
  }

  @Test
  void test() {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(Collections.singletonList(PROJECT_KEY));
    List<Issue> issuesList = newWsClient(orchestrator)
      .issues()
      .search(request)
      .getIssuesList()
      .stream()
      .filter(i -> i.getRule().startsWith("css:"))
      .collect(Collectors.toList());

    assertThat(issuesList)
      .extracting(Issue::getRule, Issue::getComponent)
      .containsExactly(tuple("css:S1128", "css-dir-with-paren:src/file1.css"));
  }
}
