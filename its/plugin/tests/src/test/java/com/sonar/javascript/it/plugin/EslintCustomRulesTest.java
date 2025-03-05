/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.util.Collections;
import java.util.List;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.Issues.Issue;

class EslintCustomRulesTest {

  private static final String PLUGIN_ARTIFACT_ID = "eslint-custom-rules-plugin";

  private static OrchestratorExtension orchestrator;

  @BeforeAll
  public static void before() {
    orchestrator = initOrchestrator(PLUGIN_ARTIFACT_ID);
  }

  @AfterAll
  public static void after() {
    orchestrator.stop();
  }

  static OrchestratorExtension initOrchestrator(String customRulesArtifactId) {
    var orchestrator = OrchestratorExtension.builderEnv()
      .useDefaultAdminCredentialsForBuilds(true)
      .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
      .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
      .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-js-profile.xml"))
      .addPlugin(
        FileLocation.byWildcardMavenFilename(
          new File("../plugins/" + customRulesArtifactId + "/target"),
          customRulesArtifactId + "-*.jar"
        )
      )
      .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-typescript-custom-rules.xml"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/nosonar.xml"))
      .build();
    // Installation of SQ server in orchestrator is not thread-safe, so we need to synchronize
    synchronized (OrchestratorStarter.class) {
      orchestrator.start();
    }
    return orchestrator;
  }

  static List<Issue> findIssues(String ruleKey, Orchestrator orchestrator) {
    org.sonarqube.ws.client.issues.SearchRequest searchRequest =
      new org.sonarqube.ws.client.issues.SearchRequest();
    searchRequest.setRules(Collections.singletonList(ruleKey));
    Issues.SearchWsResponse response = OrchestratorStarter.newWsClient(orchestrator)
      .issues()
      .search(searchRequest);
    return response.getIssuesList();
  }

  static BuildResult runBuild(Orchestrator orchestrator) {
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDirNoCopy("custom_rules"))
      .setProjectKey("custom-rules")
      .setProjectName("Custom Rules")
      .setProjectVersion("1.0")
      .setDebugLogs(true)
      .setSourceDirs("src");
    orchestrator.getServer().provisionProject("custom-rules", "Custom Rules");
    orchestrator
      .getServer()
      .associateProjectToQualityProfile("custom-rules", "js", "javascript-custom-rules-profile");
    orchestrator
      .getServer()
      .associateProjectToQualityProfile("custom-rules", "ts", "ts-custom-rules-profile");
    return orchestrator.executeBuild(build);
  }

  @Test
  void test() {
    BuildResult buildResult = runBuild(orchestrator);
    assertThat(
      buildResult.getLogsLines(l ->
        l.matches(
          ".*DEBUG: Deploying custom rules bundle jar:file:.*/custom-eslint-based-rules-1\\.0\\.0\\.tgz to .*"
        )
      )
    ).hasSize(1);
    assertThat(
      buildResult.getLogsLines(l ->
        l.contains(
          "Custom JavaScript rules are deprecated and API will be removed in future version."
        )
      )
    ).isEmpty();
    assertThat(
      buildResult.getLogsLines(l -> l.matches(".*INFO: Work dir received: .*[/|\\\\].scannerwork$"))
    ).hasSize(2);
    assertThat(buildResult.getLogsLines(l -> l.contains("Rule context options:"))).hasSize(2);
    List<Issue> issues = findIssues("eslint-custom-rules:sqKey", orchestrator);
    assertThat(issues).hasSize(2);
    assertThat(issues)
      .extracting(Issue::getRule, Issue::getComponent, Issue::getLine, Issue::getMessage)
      .containsExactlyInAnyOrder(
        new Tuple("eslint-custom-rules:sqKey", "custom-rules:src/dir/Person.js", 21, "call"),
        new Tuple("eslint-custom-rules:sqKey", "custom-rules:src/dir/file.ts", 4, "call")
      );
    issues = findIssues("ts-custom-rules:tsRuleKey", orchestrator);
    assertThat(issues)
      .extracting(Issue::getRule, Issue::getComponent, Issue::getLine, Issue::getMessage)
      .containsExactlyInAnyOrder(
        new Tuple("ts-custom-rules:tsRuleKey", "custom-rules:src/dir/file.ts", 4, "tsrule call")
      );
  }
}
