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
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import java.nio.file.Path;
import java.util.List;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.client.issues.SearchRequest;

import static com.sonar.javascript.it.plugin.Tests.newWsClient;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

public class TypeScriptAnalysisTest {

  @ClassRule
  public static final Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("tsproject");

  @BeforeClass
  public static void startServer() throws Exception {
    orchestrator.resetData();

    TestUtils.npmInstall(PROJECT_DIR);
  }

  @Test
  public void test() throws Exception {
    String projectKey = "tsproject";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);


    Tests.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issues.Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(2);

    assertThat(result.getLogsLines(log -> log.contains("Found 1 tsconfig.json files"))).hasSize(1);
  }

  @Test
  public void should_use_custom_tsconfig() throws Exception {
    String projectKey = "tsproject-custom";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR)
      .setProperty("sonar.nodejs.executable", TestUtils.getNodeJSExecutable())
      .setProperty("sonar.typescript.tsconfigPath", "custom.tsconfig.json");

    Tests.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issues.Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).hasSize(1);
    Issues.Issue issue = issuesList.get(0);
    assertThat(issue.getLine()).isEqualTo(2);
    assertThat(issue.getComponent()).isEqualTo(projectKey + ":fileUsedInCustomTsConfig.ts");

    Path tsconfig = PROJECT_DIR.toPath().resolve("custom.tsconfig.json").toAbsolutePath();
    assertThat(result.getLogsLines(l -> l.contains("Using " + tsconfig + " from sonar.typescript.tsconfigPath property"))).hasSize(1);

  }

  private List<Issues.Issue> getIssues(String projectKey) {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("typescript:S3923"));
    return newWsClient().issues().search(request).getIssuesList();
  }
}
