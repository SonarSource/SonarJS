/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.newWsClient;
import static com.sonar.javascript.it.plugin.ProfileGenerator.generateProfile;
import static java.util.Collections.emptySet;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.regex.Pattern;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;

@ExtendWith(OrchestratorStarter.class)
class EslintBasedRulesTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static String jsProfile;

  @BeforeAll
  static void setup() {
    jsProfile =
      generateProfile(
        orchestrator,
        "js",
        "javascript",
        new ProfileGenerator.RulesConfiguration(),
        emptySet()
      );
  }

  @Test
  void test_without_ts() {
    testProject(TestUtils.projectDir("eslint_based_rules"), "eslint-based-rules-project");
  }

  @Test
  void test_with_ts() throws IOException, InterruptedException {
    // When project contains both JS and TS, ts dependency will be available, therefore @typescript-eslint/eslint-plugin
    // rules will also be available, causing potential conflicts.
    File projectDir = TestUtils.projectDir("eslint_based_rules_with_ts");
    testProject(projectDir, "eslint-based-rules-project-with-ts");
  }

  public void testProject(File projectDir, String projectKey) {
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProjectDir(projectDir);

    OrchestratorStarter.setProfile(projectKey, jsProfile, "js");
    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.getLogsLines(l -> l.startsWith("ERROR"))).isEmpty();
    // assert that there are no logs from Apache HttpClient
    assertThat(buildResult.getLogsLines(l -> l.contains("preparing request execution"))).isEmpty();

    List<Issue> issuesList = getIssueList(projectKey, "javascript:S3923");
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(1);
  }

  @Test
  void test_directory_with_special_chars() {
    String projectKey = "special-chars";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDirNoCopy("(dir with paren)/eslint_based_rules"));

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "js");

    orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssueList(projectKey, "javascript:S3923");
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(5);
  }

  @Test
  void test_js_with_ts_eslint_parser() {
    String projectKey = "js-with-ts-eslint-key";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("js-with-ts-eslint-project"));

    OrchestratorStarter.setProfile(projectKey, "js-with-ts-eslint-profile", "js");

    orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssueList(projectKey, "javascript:S3525");
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(2);
  }

  @Test
  void test_exclusion_filter() throws Exception {
    String projectKey = "file-filter-project";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDirNoCopy("file-filter/excluded_dir/project"))
      .setProperty("sonar.javascript.exclusions", "excluded_dir/**");

    OrchestratorStarter.setProfile(projectKey, jsProfile, "js");

    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.getLogsLines(l -> l.startsWith("ERROR"))).isEmpty();
    List<Issue> issuesList = getIssueList(projectKey, "javascript:S3923");
    assertThat(issuesList)
      .hasSize(1)
      .extracting(Issue::getComponent)
      .containsExactly("file-filter-project:main.js");
  }

  @Test
  // cwd - current working directory
  void should_not_use_node_in_cwd() throws Exception {
    if (!System.getProperty("os.name").startsWith("Windows")) {
      // this test only makes sense on Windows
      return;
    }
    String projectKey = "eslint_based_rules";
    File projectDir = TestUtils.projectDir(projectKey);
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProperty("sonar.nodejs.forceHost", "true")
      .setProjectDir(projectDir);

    // copy ping.exe to node.exe and place it in the project directory
    Path ping = Paths.get("C:\\Windows\\System32\\PING.EXE");
    Path fakeNodePath = projectDir.toPath().resolve("node.exe");
    Files.copy(ping, fakeNodePath, StandardCopyOption.REPLACE_EXISTING);
    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.isSuccess()).isTrue();
    assertThat(buildResult.getLogs())
      .contains("Looking for Node.js in the PATH using where.exe (Windows)");

    // compare that the node which we used is not "ping.exe"
    String log = buildResult.getLogsLines(s -> s.contains("Found node.exe at")).get(0);
    Path nodePath = Paths.get(log.substring(log.indexOf("at") + 3));
    assertThat(nodePath).isNotEqualTo(fakeNodePath);
    byte[] nodeBytes = Files.readAllBytes(nodePath);
    byte[] pingBytes = Files.readAllBytes(ping);
    assertThat(pingBytes).isNotEqualTo(nodeBytes);
  }

  @Test
  void quickfix() throws Exception {
    var projectKey = "quickfix";
    var projectDir = TestUtils.projectDir(projectKey);
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);
    OrchestratorStarter.setProfile(projectKey, jsProfile, "js");

    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.getLogsLines(l -> l.startsWith("ERROR"))).isEmpty();

    var issuesList = getIssueList(projectKey, "javascript:S1116");
    assertThat(issuesList).hasSize(1);
    var issue = issuesList.get(0);
    assertThat(issue.getLine()).isEqualTo(2);
    assertThat(issue.getQuickFixAvailable()).isTrue();
  }

  @Test
  void jsFileNamedAsTsFile() {
    var projectKey = "same-filename";
    var projectDir = TestUtils.projectDir(projectKey);
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProjectDir(projectDir);
    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "js");

    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(
      buildResult.getLogsLines(l ->
        l.contains("Failed to parse") && l.contains("with TypeScript parser")
      )
    )
      .isEmpty();

    var issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getRule, Issue::getComponent)
      .containsExactlyInAnyOrder(
        tuple("javascript:S3403", projectKey + ":file.js"), // rule requires type information
        tuple("javascript:S3923", projectKey + ":file.js"), // rule does not require type information
        tuple("typescript:S3923", projectKey + ":file.ts")
      );
  }

  @Test
  void should_log_memory_config() {
    var projectKey = "eslint_based_rules";
    var projectDir = TestUtils.projectDir(projectKey);
    var build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.node.maxspace", "500000")
      .setProperty("sonar.javascript.node.debugMemory", "true")
      .setDebugLogs(true)
      .setProjectDir(projectDir);

    var buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.isSuccess()).isTrue();
    assertThat(buildResult.getLogs()).contains("Configured Node.js --max-old-space-size=500000.");
    var osMem = Pattern.compile(
      ".*Memory configuration: OS \\(\\d+ MB\\),.*",
      Pattern.DOTALL
    );
    assertThat(buildResult.getLogs()).matches(osMem);
    var warn = Pattern.compile(
      ".*WARN: Node.js heap size limit \\d+ is higher than available memory \\d+. Check your configuration of sonar\\.javascript\\.node\\.maxspace.*",
      Pattern.DOTALL
    );
    assertThat(buildResult.getLogs()).matches(warn);
    assertThat(buildResult.getLogs()).contains("used_heap_size");
  }

  @NotNull
  private static List<Issue> getIssueList(String projectKey, String ruleKey) {
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList(ruleKey));
    return newWsClient(orchestrator).issues().search(request).getIssuesList();
  }
}
