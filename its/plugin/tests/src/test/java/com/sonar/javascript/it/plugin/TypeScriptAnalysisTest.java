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
import java.io.File;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@ExtendWith(OrchestratorStarter.class)
public class TypeScriptAnalysisTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("tsproject");

  @Test
  public void test() throws Exception {
    String projectKey = "tsproject";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    String sampleFileKey = projectKey + ":sample.lint.ts";
    List<Issue> issuesList = getIssues(sampleFileKey);
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(4);

    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "ncloc")).isEqualTo(7);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "classes")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "functions")).isEqualTo(1);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "statements")).isEqualTo(3);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "comment_lines")).isEqualTo(1);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "complexity")).isEqualTo(2);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "cognitive_complexity")).isEqualTo(2);

    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_lines")).isEqualTo(111.0);
    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_blocks")).isEqualTo(2.0);
    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_files")).isEqualTo(1.0);

    issuesList = getIssues(projectKey + ":nosonar.lint.ts");
    assertThat(issuesList).hasSize(1);

    assertThat(result.getLogsLines(log -> log.contains("Found 1 tsconfig.json file(s)"))).hasSize(1);
  }

  @Test
  public void should_use_custom_tsconfig() throws Exception {
    String projectKey = "tsproject-custom";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR)
      .setProperty("sonar.typescript.tsconfigPath", "custom.tsconfig.json");

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).hasSize(1);
    Issue issue = issuesList.get(0);
    assertThat(issue.getLine()).isEqualTo(2);
    assertThat(issue.getComponent()).isEqualTo(projectKey + ":fileUsedInCustomTsConfig.ts");

    Path tsconfig = PROJECT_DIR.toPath().resolve("custom.tsconfig.json").toAbsolutePath();
    assertThat(result.getLogsLines(l -> l.contains("Using " + tsconfig + " from sonar.typescript.tsconfigPath property"))).hasSize(1);
  }

  @Test
  public void should_analyze_without_tsconfig() throws Exception {
    File dir = TestUtils.projectDir("missing-tsconfig");

    String projectKey = "missing-tsconfig";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      .setDebugLogs(true);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    // we don't support analysis without tsconfig when using ts.Program
    assertThat(issuesList).isEmpty();
    assertThat(result.getLogsLines(l -> l.contains("Using generated tsconfig.json file"))).isEmpty();
  }

  /**
   * This test is testing the analysis when vue files is present in the project without tsconfig
   * This is legacy behavior, which we might discontinue to support, because it's not very realistic
   */
  @Test
  public void should_analyze_without_tsconfig_vue() throws Exception {
    File dir = TestUtils.projectDir("missing-tsconfig-vue");

    String projectKey = "missing-tsconfig-vue";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      .setDebugLogs(true);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).extracting(Issue::getLine, Issue::getRule, Issue::getComponent).containsExactlyInAnyOrder(
      tuple(2, "typescript:S4325", "missing-tsconfig-vue:src/main.ts"),
      tuple(6, "typescript:S3923", "missing-tsconfig-vue:src/file.vue")
    );

    assertThat(result.getLogsLines(l -> l.contains("Using generated tsconfig.json file"))).hasSize(1);
  }

  @Test
  public void should_exclude_from_extended_tsconfig() throws Exception {
    File dir = TestUtils.projectDir("tsproject-extended");

    String projectKey = "tsproject-extended";
    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      .setDebugLogs(true);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).extracting(Issue::getLine, Issue::getRule, Issue::getComponent).containsExactly(
      tuple(2, "typescript:S3923", "tsproject-extended:dir/file.ts")
    );

    assertThat(result.getLogsLines(l -> l.contains("Skipped 1 file(s) because they were not part of any tsconfig"))).hasSize(1);
    assertThat(result.getLogsLines(l -> l.contains("File not part of any tsconfig: dir/file.excluded.ts"))).hasSize(1);
  }

  @Test
  public void should_support_solution_tsconfig() {
    String projectKey = "solution-tsconfig";
    File dir = TestUtils.projectDir(projectKey);

    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).extracting(Issue::getLine, Issue::getRule, Issue::getComponent).containsExactly(
      tuple(4, "typescript:S3923", "solution-tsconfig:src/file.ts"),
      tuple(4, "typescript:S3923", "solution-tsconfig:src/unlisted.ts")
    );

    assertThat(result.getLogsLines(l -> l.contains("Skipped") && l.contains("because they were not part of any tsconfig"))).isEmpty();
  }

  @Test
  public void should_support_solution_tsconfig_with_dir_reference() {
    String projectKey = "solution-tsconfig-custom";
    File dir = TestUtils.projectDir(projectKey);

    SonarScanner build = SonarScanner.create()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      // setting the property to disable automatic search for tsconfig files
      .setProperty("sonar.typescript.tsconfigPath", "tsconfig.json");

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).extracting(Issue::getLine, Issue::getRule, Issue::getComponent).containsExactly(
      tuple(4, "typescript:S3923", "solution-tsconfig-custom:src/file.ts"),
      tuple(4, "typescript:S3923", "solution-tsconfig-custom:src/unlisted.ts")
    );

    assertThat(result.getLogsLines(l -> l.contains("Skipped") && l.contains("because they were not part of any tsconfig"))).isEmpty();
  }
}
