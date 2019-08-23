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

import com.google.common.collect.ImmutableList;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.sonar.api.utils.System2;
import org.sonarqube.ws.Issues;
import org.sonarqube.ws.client.issues.SearchRequest;

import static com.sonar.javascript.it.plugin.Tests.newWsClient;
import static org.assertj.core.api.Assertions.assertThat;

public class TypeScriptAnalysisTest {

  @ClassRule
  public static final Orchestrator orchestrator = Tests.ORCHESTRATOR;

  private static final String TSPROJECT = "tsproject";
  private static final File PROJECT_DIR = TestUtils.projectDir(TSPROJECT);

  @BeforeClass
  public static void startServer() throws Exception {
    orchestrator.resetData();

    String projectKey = TSPROJECT;
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR)
      .setProperty("sonar.nodejs.executable", TestUtils.getNodeJSExecutable());

    Tests.setProfile(projectKey, "eslint-based-rules-profile");

    installTypesScript();

    orchestrator.executeBuild(build);
  }

  private static void installTypesScript() throws IOException, InterruptedException {
    String npm = System2.INSTANCE.isOsWindows() ? "npm.cmd" : "npm";
    String[] cmd = {npm, "install", "typescript"};
    Process process = Runtime.getRuntime().exec(cmd, null, PROJECT_DIR);
    int returnValue = process.waitFor();
    if (returnValue != 0) {
      throw new IllegalStateException("Failed to install TypeScript");
    }
  }

  @Test
  public void test() {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(Collections.singletonList(TSPROJECT)).setRules(ImmutableList.of("javascript:S3923"));
    List<Issues.Issue> issuesList = newWsClient().issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(2);
  }
}
