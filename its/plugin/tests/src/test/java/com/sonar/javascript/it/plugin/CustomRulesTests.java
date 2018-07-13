/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2018 SonarSource SA
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
import java.util.Collections;
import java.util.List;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.Rules;
import org.sonarqube.ws.client.HttpConnector;
import org.sonarqube.ws.client.WsClient;
import org.sonarqube.ws.client.WsClientFactories;
import org.sonarqube.ws.client.rules.SearchRequest;

import static org.assertj.core.api.Assertions.assertThat;

public class CustomRulesTests {

  public static final String CUSTOM_RULES_WHILE_CHECK = "javascript-custom-rules:whileCheck";
  @ClassRule
  public static Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @BeforeClass
  public static void prepare() {
    orchestrator.resetData();
    SonarScanner build = Tests.createScanner()
      .setProjectDir(TestUtils.projectDir("custom_rules"))
      .setProjectKey("custom-rules")
      .setProjectName("Custom Rules")
      .setProjectVersion("1.0")
      .setSourceDirs("src");
    orchestrator.getServer().provisionProject("custom-rules", "Custom Rules");
    orchestrator.getServer().associateProjectToQualityProfile("custom-rules", "js", "javascript-custom-rules-profile");
    orchestrator.executeBuild(build);
  }

  @Test
  public void base_tree_visitor_check() {
    List<Issues.Issue> issues = findIssues("deprecated-custom-rules:base");

    assertThat(issues).hasSize(1);

    Issues.Issue issue = issues.get(0);
    assertThat(issue.getLine()).isEqualTo(2);
    assertThat(issue.getMessage()).isEqualTo("Function expression.");
    assertThat(issue.getDebt()).isEqualTo("5min");
  }

  @Test
  public void subscription_base_visitor_check() {
    List<Issues.Issue> issues = findIssues("deprecated-custom-rules:subscription");

    assertThat(issues).hasSize(1);

    Issues.Issue issue = issues.get(0);
    assertThat(issue.getLine()).isEqualTo(11);
    assertThat(issue.getMessage()).isEqualTo("For in statement.");
    assertThat(issue.getDebt()).isEqualTo("10min");
  }

  @Test
  public void rule_from_check_registrar_should_raise_issue() {
    List<Issues.Issue> issues = findIssues(CUSTOM_RULES_WHILE_CHECK);
    assertThat(issues).hasSize(1);

    Issues.Issue issue = issues.get(0);
    assertThat(issue.getLine()).isEqualTo(18);
    assertThat(issue.getMessage()).isEqualTo("While statement.");
    assertThat(issue.getDebt()).isEqualTo("5min");
  }

  @Test
  public void should_have_html_description_loaded() {
    List<Rules.Rule> rulesList = findRule(CUSTOM_RULES_WHILE_CHECK);
    assertThat(rulesList).hasSize(1);
    Rules.Rule rule = rulesList.get(0);
    assertThat(rule.getHtmlDesc()).contains("This is very important rule");
  }

  private List<Rules.Rule> findRule(String ruleKey) {
    SearchRequest searchRequest = new SearchRequest();
    searchRequest.setRuleKey(ruleKey);
    Rules.SearchResponse searchResponse = newWsClient().rules().search(searchRequest);
    return searchResponse.getRulesList();
  }

  private List<Issues.Issue> findIssues(String ruleKey) {
    org.sonarqube.ws.client.issues.SearchRequest searchRequest = new org.sonarqube.ws.client.issues.SearchRequest();
    searchRequest.setRules(Collections.singletonList(ruleKey));
    Issues.SearchWsResponse response = newWsClient().issues().search(searchRequest);
    return response.getIssuesList();
  }

  private static WsClient newWsClient() {
    return WsClientFactories.getDefault().newClient(HttpConnector.newBuilder()
      .url(orchestrator.getServer().getUrl())
      .build());
  }


}
