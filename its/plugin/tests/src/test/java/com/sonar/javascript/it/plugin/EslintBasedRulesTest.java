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
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;
import org.sonarsource.analyzer.commons.ProfileGenerator;

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
  public void test_without_ts() {
    testProject(TestUtils.projectDir("eslint_based_rules"), "eslint-based-rules-project");
  }

  @Test
  public void test_with_ts() throws IOException, InterruptedException {
    // When project contains both JS and TS, ts dependency will be available, therefore @typescript-eslint/eslint-plugin
    // rules will also be available, causing potential conflicts.
    File projectDir = TestUtils.projectDir("eslint_based_rules_with_ts");
    TestUtils.npmInstall(projectDir);
    testProject(projectDir, "eslint-based-rules-project-with-ts");
  }

  public void testProject(File projectDir, String projectKey) {
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);

    File jsProfile = ProfileGenerator.generateProfile(orchestrator.getServer().getUrl(), "js",
      "javascript", new ProfileGenerator.RulesConfiguration(), new HashSet<>());
    orchestrator.getServer().restoreProfile(FileLocation.of(jsProfile));

    Tests.setProfile(projectKey, "rules", "js");

    orchestrator.executeBuild(build);

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3923"));
    List<Issue> issuesList = newWsClient().issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(1);
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
