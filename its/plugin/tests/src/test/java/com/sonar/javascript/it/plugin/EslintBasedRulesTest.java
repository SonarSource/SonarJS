/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2021 SonarSource SA
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
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;
import org.sonarsource.analyzer.commons.ProfileGenerator;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.newWsClient;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OrchestratorStarter.class)
public class EslintBasedRulesTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @Test
  public void test_without_ts() {
    testProject(TestUtils.projectDir("eslint_based_rules"), "eslint-based-rules-project");
  }

  @Test
  public void test_with_ts() throws IOException, InterruptedException {
    // When project contains both JS and TS, ts dependency will be available, therefore @typescript-eslint/eslint-plugin
    // rules will also be available, causing potential conflicts.
    File projectDir = TestUtils.projectDir("eslint_based_rules_with_ts");
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

    OrchestratorStarter.setProfile(projectKey, "rules", "js");

    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.getLogsLines(l -> l.startsWith("ERROR"))).isEmpty();

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3923"));
    List<Issue> issuesList = newWsClient(OrchestratorStarter.ORCHESTRATOR).issues().search(request).getIssuesList();
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

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "js");

    orchestrator.executeBuild(build);

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3923"));
    List<Issue> issuesList = newWsClient(OrchestratorStarter.ORCHESTRATOR).issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(5);
  }

  @Test
  public void test_js_with_ts_eslint_parser() {
    String projectKey = "js-with-ts-eslint-key";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("js-with-ts-eslint-project"));

    OrchestratorStarter.setProfile(projectKey, "js-with-ts-eslint-profile", "js");

    orchestrator.executeBuild(build);

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3525"));
    List<Issue> issuesList = newWsClient(OrchestratorStarter.ORCHESTRATOR).issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(2);
  }

  @Test
  public void test_exclusion_filter() throws Exception {
    String projectKey = "file-filter-project";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("file-filter/excluded_dir/project"))
      .setProperty("sonar.javascript.exclusions", "excluded_dir/**");

    File jsProfile = ProfileGenerator.generateProfile(orchestrator.getServer().getUrl(), "js",
      "javascript", new ProfileGenerator.RulesConfiguration(), new HashSet<>());
    orchestrator.getServer().restoreProfile(FileLocation.of(jsProfile));

    OrchestratorStarter.setProfile(projectKey, "rules", "js");

    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.getLogsLines(l -> l.startsWith("ERROR"))).isEmpty();
    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(projectKey)).setRules(singletonList("javascript:S3923"));
    List<Issue> issuesList = newWsClient(orchestrator).issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1)
      .extracting(Issue::getComponent)
      .containsExactly("file-filter-project:main.js");
  }

  @Test
  // cwd - current working directory
  public void should_not_use_node_in_cwd() throws Exception {
    if (!System.getProperty("os.name").startsWith("Windows")) {
      // this test only makes sense on Windows
      return;
    }
    String projectKey = "eslint_based_rules";
    File projectDir = TestUtils.projectDir(projectKey);
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProjectDir(projectDir);

    // copy ping.exe to node.exe and place it in the project directory
    Path ping = Paths.get("C:\\Windows\\System32\\PING.EXE");
    Path fakeNodePath = projectDir.toPath().resolve("node.exe");
    Files.copy(ping, fakeNodePath, StandardCopyOption.REPLACE_EXISTING);
    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.isSuccess()).isTrue();
    assertThat(buildResult.getLogs()).contains("Looking for Node.js in the PATH using where.exe (Windows)");

    // compare that the node which we used is not "ping.exe"
    String log = buildResult.getLogsLines(s -> s.contains("Found node.exe at")).get(0);
    Path nodePath = Paths.get(log.substring(log.indexOf("at") + 3));
    assertThat(nodePath).isNotEqualTo(fakeNodePath);
    byte[] nodeBytes = Files.readAllBytes(nodePath);
    byte[] pingBytes = Files.readAllBytes(ping);
    assertThat(pingBytes).isNotEqualTo(nodeBytes);
  }

  @Test
  public void should_record_perf_metrics() throws Exception {
    String projectKey = "eslint_based_rules";
    File projectDir = TestUtils.projectDir(projectKey);
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProperty("sonar.javascript.monitoring", "true")
      .setProperty("sonar.javascript.monitoring.path", projectDir.toPath().resolve(".scannerwork").toString())
      .setProjectDir(projectDir);

    BuildResult buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.isSuccess()).isTrue();
    assertThat(projectDir.toPath().resolve(".scannerwork/metrics.json")).exists();
  }
}
