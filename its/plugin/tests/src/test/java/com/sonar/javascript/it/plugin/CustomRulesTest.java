/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2020 SonarSource SA
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
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.util.Collections;
import java.util.List;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.Rules;
import org.sonarqube.ws.client.HttpConnector;
import org.sonarqube.ws.client.WsClient;
import org.sonarqube.ws.client.WsClientFactories;
import org.sonarqube.ws.client.rules.SearchRequest;

import static com.sonar.javascript.it.plugin.Tests.JAVASCRIPT_PLUGIN_LOCATION;
import static org.assertj.core.api.Assertions.assertThat;

public class CustomRulesTest {

  private static final String CUSTOM_RULES = "javascript-custom-rules:";
  private static final String CUSTOM_RULES_ARTIFACT_ID = "custom-rules-plugin";

  static final String SUBSCRIPTION_CHECK = "subscription";
  static final String BASE_CHECK = "base";

  private static Orchestrator orchestrator;

  @BeforeClass
  public static void before() {
    orchestrator = initOrchestrator(CUSTOM_RULES_ARTIFACT_ID);
  }

  @AfterClass
  public static void after() {
    orchestrator.stop();
  }

  @Test
  public void should_have_issues() {
    List<Issues.Issue> issues = findIssues(CUSTOM_RULES + BASE_CHECK, orchestrator);
    assertBaseCheck(issues);

    issues = findIssues(CUSTOM_RULES + SUBSCRIPTION_CHECK, orchestrator);
    assertSubscriptionCheckIssues(issues);
  }


  @Test
  public void should_have_html_description_loaded() {
    List<Rules.Rule> rulesList = findRule(CUSTOM_RULES + BASE_CHECK, orchestrator);
    assertThat(rulesList).hasSize(1);
    Rules.Rule rule = rulesList.get(0);
    assertThat(rule.getHtmlDesc()).contains("This is very important rule");
  }

  static Orchestrator initOrchestrator(String customRulesArtifactId) {
    Orchestrator orchestrator = Orchestrator.builderEnv()
      .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
      .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
      .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-js-profile.xml"))
      .addPlugin(FileLocation.byWildcardMavenFilename(
        new File("../plugins/" + customRulesArtifactId + "/target"), customRulesArtifactId + "-*.jar"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/nosonar.xml"))
      .build();
    orchestrator.start();

    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("custom_rules"))
      .setProjectKey("custom-rules")
      .setProjectName("Custom Rules")
      .setProjectVersion("1.0")
      .setSourceDirs("src");
    orchestrator.getServer().provisionProject("custom-rules", "Custom Rules");
    orchestrator.getServer().associateProjectToQualityProfile("custom-rules", "js", "javascript-custom-rules-profile");
    orchestrator.executeBuild(build);
    return orchestrator;
  }

  static void assertBaseCheck(List<Issues.Issue> issues) {
    assertThat(issues).hasSize(1);

    Issues.Issue issue = issues.get(0);
    assertThat(issue.getLine()).isEqualTo(2);
    assertThat(issue.getMessage()).isEqualTo("Function expression.");
    assertThat(issue.getDebt()).isEqualTo("5min");
  }

  static void assertSubscriptionCheckIssues(List<Issues.Issue> issues) {
    assertThat(issues).hasSize(1);

    Issues.Issue issue = issues.get(0);
    assertThat(issue.getLine()).isEqualTo(11);
    assertThat(issue.getMessage()).isEqualTo("For in statement.");
    assertThat(issue.getDebt()).isEqualTo("10min");
  }

  static List<Rules.Rule> findRule(String ruleKey, Orchestrator orchestrator) {
    SearchRequest searchRequest = new SearchRequest();
    searchRequest.setRuleKey(ruleKey);
    Rules.SearchResponse searchResponse = newWsClient(orchestrator).rules().search(searchRequest);
    return searchResponse.getRulesList();
  }

  static List<Issues.Issue> findIssues(String ruleKey, Orchestrator orchestrator) {
    org.sonarqube.ws.client.issues.SearchRequest searchRequest = new org.sonarqube.ws.client.issues.SearchRequest();
    searchRequest.setRules(Collections.singletonList(ruleKey));
    Issues.SearchWsResponse response = newWsClient(orchestrator).issues().search(searchRequest);
    return response.getIssuesList();
  }

  static WsClient newWsClient(Orchestrator orchestrator) {
    return WsClientFactories.getDefault().newClient(HttpConnector.newBuilder()
      .url(orchestrator.getServer().getUrl())
      .build());
  }


}
