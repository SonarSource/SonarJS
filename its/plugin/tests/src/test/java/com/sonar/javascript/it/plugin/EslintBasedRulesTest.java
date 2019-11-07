/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2019 SonarSource SA
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
import java.util.List;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;

import static com.sonar.javascript.it.plugin.Tests.newWsClient;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

public class EslintBasedRulesTest {

  @ClassRule
  public static final Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @BeforeClass
  public static void startServer() {
    orchestrator.resetData();
  }

  @Test
  public void test() {
    String projectKey = "eslint-based-rules-project";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("eslint_based_rules"));

    Tests.setProfile(projectKey, "eslint-based-rules-profile", "js");

    orchestrator.executeBuild(build);

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3923"));
    List<Issue> issuesList = newWsClient().issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(5);
  }

  @Test
  public void test_directory_with_special_chars() {
    String projectKey = "special-chars";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("(dir with paren)/eslint_based_rules"));

    Tests.setProfile(projectKey, "eslint-based-rules-profile", "js");

    orchestrator.executeBuild(build);

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3923"));
    List<Issue> issuesList = newWsClient().issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(5);
  }

}
