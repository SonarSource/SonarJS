/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
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
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

@ExtendWith(OrchestratorStarter.class)
class TypeScriptAnalysisTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final File PROJECT_DIR = TestUtils.projectDir("tsproject");

  @Test
  void test() {
    String projectKey = "tsproject";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    BuildResult result = orchestrator.executeBuild(build);

    String sampleFileKey = projectKey + ":sample.lint.ts";
    List<Issue> issuesList = getIssues(sampleFileKey);
    assertThat(issuesList).hasSize(2);
    assertThat(issuesList.get(0).getLine()).isEqualTo(3);
    assertThat(issuesList.get(1).getLine()).isEqualTo(4);

    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "ncloc")).isEqualTo(7);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "classes")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "functions")).isEqualTo(1);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "statements")).isEqualTo(3);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "comment_lines")).isEqualTo(1);
    assertThat(OrchestratorStarter.getMeasureAsInt(sampleFileKey, "complexity")).isEqualTo(2);
    assertThat(
      OrchestratorStarter.getMeasureAsInt(sampleFileKey, "cognitive_complexity")
    ).isEqualTo(2);

    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_lines")).isEqualTo(
      111.0
    );
    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_blocks")).isEqualTo(
      2.0
    );
    assertThat(OrchestratorStarter.getMeasureAsDouble(projectKey, "duplicated_files")).isEqualTo(
      1.0
    );

    issuesList = getIssues(projectKey + ":nosonar.lint.ts");
    assertThat(issuesList).hasSize(1);

    assertThat(result.getLogsLines(log -> log.contains("Found 1 tsconfig.json file(s)"))).hasSize(
      1
    );
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
          "Resolving provided TSConfig files using '" + tsconfig.toString().replace("\\", "/") + "'"
        )
      )
    ).hasSize(1);
    assertThat(
      result.getLogsLines(l ->
        l.contains(
          "Found 1 tsconfig.json file(s): [" + tsconfig.toString().replace("\\", "/") + "]"
        )
      )
    ).hasSize(1);
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
    assertThat(
      result.getLogsLines(l ->
        l.contains(
          "Found 2 tsconfig.json file(s): " +
            tsconfigs
              .stream()
              .map(tsconfig -> tsconfig.toString().replace("\\", "/"))
              .toList()
        )
      )
    ).hasSize(1);
  }

  @Test
  void should_analyze_without_tsconfig() {
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
    assertThat(
      result.getLogsLines(l -> l.contains("Analyzing 1 file(s) using default options"))
    ).hasSize(1);
  }

  /**
   * This test is testing the analysis when vue files is present in the project without tsconfig
   * This is legacy behavior, which we might discontinue to support, because it's not very realistic
   */
  @Test
  void should_analyze_without_tsconfig_vue() {
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

    assertThat(
      result.getLogsLines(l -> l.contains("Analyzing 2 file(s) using default options"))
    ).hasSize(1);
  }

  @Test
  void should_exclude_from_extended_tsconfig() {
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

    assertThat(
      result.getLogsLines(log -> log.contains("Analyzing 1 file(s) using merged compiler options"))
    ).hasSize(1);
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

    assertThat(
      result.getLogsLines(
        l -> l.contains("Skipped") && l.contains("because they were not part of any tsconfig.json")
      )
    ).isEmpty();
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

    assertThat(
      result.getLogsLines(
        l -> l.contains("Skipped") && l.contains("because they were not part of any tsconfig.json")
      )
    ).isEmpty();
  }

  @Test
  void should_ignore_json_files_resolved_as_modules() {
    String projectKey = "resolve-json-module";
    File dir = TestUtils.projectDir(projectKey);

    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(dir)
      .setDebugLogs(true)
      .setProperty("sonar.typescript.tsconfigPath", "tsconfig.json");

    OrchestratorStarter.setProfile(projectKey, "resolve-json-module-profile", "ts");
    orchestrator.executeBuild(build);

    List<Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getLine, Issue::getRule, Issue::getComponent)
      .containsExactly(tuple(1, "typescript:S1128", "resolve-json-module:src/foo.ts"));
  }
}
