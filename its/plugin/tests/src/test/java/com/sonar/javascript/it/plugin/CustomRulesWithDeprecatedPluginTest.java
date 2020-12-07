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
import java.util.List;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.Rules;

import static com.sonar.javascript.it.plugin.CustomRulesTest.BASE_CHECK;
import static com.sonar.javascript.it.plugin.CustomRulesTest.SUBSCRIPTION_CHECK;
import static com.sonar.javascript.it.plugin.CustomRulesTest.assertBaseCheck;
import static com.sonar.javascript.it.plugin.CustomRulesTest.assertSubscriptionCheckIssues;
import static com.sonar.javascript.it.plugin.CustomRulesTest.findIssues;
import static com.sonar.javascript.it.plugin.CustomRulesTest.initOrchestrator;
import static org.assertj.core.api.Assertions.assertThat;

public class CustomRulesWithDeprecatedPluginTest {

  private static final String DEPRECATED_CUSTOM_RULES = "deprecated-custom-rules:";
  private static final String DEPRECATED_CUSTOM_RULES_ARTIFACT_ID = "deprecated-custom-rules-plugin";

  private static Orchestrator orchestrator;

  @BeforeClass
  public static void before() {
    orchestrator = initOrchestrator(DEPRECATED_CUSTOM_RULES_ARTIFACT_ID);
    CustomRulesTest.runBuild(orchestrator);
  }

  @AfterClass
  public static void after() {
    orchestrator.stop();
  }

  @Test
  public void should_have_issues() {
    List<Issues.Issue> issues = findIssues(DEPRECATED_CUSTOM_RULES + BASE_CHECK, orchestrator);
    assertBaseCheck(issues);

    issues = findIssues(DEPRECATED_CUSTOM_RULES + SUBSCRIPTION_CHECK, orchestrator);
    assertSubscriptionCheckIssues(issues);
  }

  @Test
  public void should_have_html_description_loaded() {
    List<Rules.Rule> rulesList = CustomRulesTest.findRule(DEPRECATED_CUSTOM_RULES + BASE_CHECK, orchestrator);
    assertThat(rulesList).hasSize(1);
    Rules.Rule rule = rulesList.get(0);
    assertThat(rule.getHtmlDesc()).contains("This is very important rule");
  }
}
