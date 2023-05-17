/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2023 SonarSource SA
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
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

@ExtendWith(OrchestratorStarter.class)
class TypeScriptAnalysisTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("tsproject");

  @Test
  void test() throws Exception {
    String projectKey = "tsproject";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setDebugLogs(true)
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
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "cognitive_complexity"))
      .isEqualTo(2);

    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_lines"))
      .isEqualTo(111.0);
    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_blocks"))
      .isEqualTo(2.0);
    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_files"))
      .isEqualTo(1.0);

    issuesList = getIssues(projectKey + ":nosonar.lint.ts");
    assertThat(issuesList).hasSize(1);

    assertThat(result.getLogsLines(log -> log.contains("tsconfig found:"))).hasSize(2);
  }

  @Test
  void should_use_custom_tsconfig() throws Exception {
    String projectKey = "tsproject-custom";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR)
      .setProperty("sonar.typescript.tsconfigPath", "custom.tsconfig.json");

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    var file = projectKey + ":fileUsedInCustomTsConfig.ts";
    var issuesList = getIssues(projectKey)
      .stream()
      .filter(i -> file.equals(i.getComponent()))
      .collect(Collectors.toList());
    assertThat(issuesList).hasSize(1);
    Issue issue = issuesList.get(0);
    assertThat(issue.getLine()).isEqualTo(2);
    assertThat(issue.getComponent()).isEqualTo(projectKey + ":fileUsedInCustomTsConfig.ts");

    // using `getCanonicalFile` as otherwise test is failing when executed on Windows (`C:\Windows\TEMP...` vs `C:\Windows\Temp`)
    Path tsconfig = PROJECT_DIR.getCanonicalFile().toPath().resolve("custom.tsconfig.json");
    assertThat(
      result.getLogsLines(l ->
        l.contains(
          "Resolving TSConfig files using 'custom.tsconfig.json' from property sonar.typescript.tsconfigPath"
        )
      )
    )
      .hasSize(1);
    assertThat(result.getLogsLines(l -> l.contains("Found 1 TSConfig file(s): [" + tsconfig + "]")))
      .hasSize(1);
  }

  @Test
  void should_use_multiple_custom_tsconfigs() throws Exception {
    String projectKey = "tsproject-customs";
    File projectDir = TestUtils.projectDir("tsprojects");

    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir)
      .setProperty("sonar.typescript.tsconfigPaths", "tsconfig.json,**/custom.tsconfig.json");

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getLine, Issue::getComponent)
      .containsExactlyInAnyOrder(
        tuple(2, "tsproject-customs:file.ts"),
        tuple(2, "tsproject-customs:dir/file.ts")
      );

    List<Path> tsconfigs = Arrays.asList(
      projectDir.getCanonicalFile().toPath().resolve(Paths.get("dir", "custom.tsconfig.json")),
      projectDir.getCanonicalFile().toPath().resolve("tsconfig.json")
    );
    assertThat(result.getLogsLines(l -> l.contains("Found 2 TSConfig file(s): " + tsconfigs)))
      .hasSize(1);
  }

  @Test
  void should_analyze_without_tsconfig() throws Exception {
    File dir = TestUtils.projectDir("missing-tsconfig");

    String projectKey = "missing-tsconfig";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      .setDebugLogs(true);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).extracting(Issue::getRule).containsExactly("typescript:S4325");
    assertThat(result.getLogsLines(fallbackTsConfigLogPredicate("main\\.ts").asMatchPredicate()))
      .hasSize(1);
  }

  /**
   * This test is testing the analysis when vue files is present in the project without tsconfig
   * This is legacy behavior, which we might discontinue to support, because it's not very realistic
   */
  @Test
  void should_analyze_without_tsconfig_vue() throws Exception {
    File dir = TestUtils.projectDir("missing-tsconfig-vue");

    String projectKey = "missing-tsconfig-vue";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      .setDebugLogs(true);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getLine, Issue::getRule, Issue::getComponent)
      .containsExactlyInAnyOrder(
        tuple(2, "typescript:S4325", "missing-tsconfig-vue:src/main.ts"),
        tuple(6, "typescript:S3923", "missing-tsconfig-vue:src/file.vue")
      );

    assertThat(result.getLogsLines(fallbackTsConfigLogPredicate("main\\.ts").asMatchPredicate()))
      .hasSize(1);
  }

  @Test
  void should_exclude_from_extended_tsconfig() throws Exception {
    File dir = TestUtils.projectDir("tsproject-extended");

    String projectKey = "tsproject-extended";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      .setDebugLogs(true);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getLine, Issue::getRule, Issue::getComponent)
      .containsExactlyInAnyOrder(
        tuple(2, "typescript:S3923", "tsproject-extended:dir/file.ts"),
        tuple(2, "typescript:S3923", "tsproject-extended:dir/file.excluded.ts")
      );

    var pattern = fallbackTsConfigLogPredicate("file\\.excluded\\.ts");
    var logsLines = result.getLogsLines(pattern.asMatchPredicate());
    assertThat(logsLines).hasSize(1);
  }

  @NotNull
  private static Pattern fallbackTsConfigLogPredicate(String file) {
    return Pattern.compile(
      ".*DEBUG: Analyzing file .*" + file + " using tsconfig tsconfig-.*" + file + "\\.json"
    );
  }

  @Test
  void should_support_solution_tsconfig() {
    String projectKey = "solution-tsconfig";
    File dir = TestUtils.projectDir(projectKey);

    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getLine, Issue::getRule, Issue::getComponent)
      .containsExactly(
        tuple(4, "typescript:S3923", "solution-tsconfig:src/file.ts"),
        tuple(4, "typescript:S3923", "solution-tsconfig:src/unlisted.ts")
      );
  }

  @Test
  void should_support_solution_tsconfig_with_dir_reference() {
    String projectKey = "solution-tsconfig-custom";
    File dir = TestUtils.projectDir(projectKey);

    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      // setting the property to disable automatic search for tsconfig files
      .setProperty("sonar.typescript.tsconfigPath", "tsconfig.json");

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getLine, Issue::getRule, Issue::getComponent)
      .containsExactly(
        tuple(4, "typescript:S3923", "solution-tsconfig-custom:src/file.ts"),
        tuple(4, "typescript:S3923", "solution-tsconfig-custom:src/unlisted.ts")
      );
  }
}
