/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues;

@ExtendWith(OrchestratorStarter.class)
class VueAnalysisTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @Test
  void sonarqube() {
    String projectKey = "vue-js-project";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir(projectKey));

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "js");
    orchestrator.executeBuild(build);

    List<Issues.Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getLine()).isEqualTo(6);

    assertThat(OrchestratorStarter.getMeasureAsInt(projectKey, "ncloc")).isEqualTo(15);
    assertThat(OrchestratorStarter.getMeasureAsInt(projectKey, "classes")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(projectKey, "functions")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(projectKey, "statements")).isEqualTo(3);
    assertThat(OrchestratorStarter.getMeasureAsInt(projectKey, "comment_lines")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(projectKey, "complexity")).isEqualTo(1);
    assertThat(OrchestratorStarter.getMeasureAsInt(projectKey, "cognitive_complexity"))
      .isEqualTo(2);
  }

  @Test
  void jsWithinVueAsJavaScript() {
    String projectKey = "vue-js-project-with-lang-js";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("vue-js-project-with-lang-js"));

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "js");
    orchestrator.executeBuild(build);

    List<Issues.Issue> issuesList = getIssues(projectKey);
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getRule()).isEqualTo("javascript:S3923");
  }

  @Test
  void tsWithinVueAsTypeScript() {
    String projectKey = "vue-js-project-with-lang-ts";
    SonarScanner build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(TestUtils.projectDir("vue-js-project-with-lang-ts"));

    OrchestratorStarter.setProfile(projectKey, "eslint-based-rules-profile", "ts");
    orchestrator.executeBuild(build);

    // assert metrics on .vue file
    String vueFileKey = projectKey + ":file.vue";
    assertThat(OrchestratorStarter.getMeasureAsInt(vueFileKey, "ncloc")).isEqualTo(15);
    assertThat(OrchestratorStarter.getMeasureAsInt(vueFileKey, "classes")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(vueFileKey, "functions")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(vueFileKey, "statements")).isEqualTo(3);
    assertThat(OrchestratorStarter.getMeasureAsInt(vueFileKey, "comment_lines")).isEqualTo(0);
    assertThat(OrchestratorStarter.getMeasureAsInt(vueFileKey, "complexity")).isEqualTo(1);
    assertThat(OrchestratorStarter.getMeasureAsInt(vueFileKey, "cognitive_complexity"))
      .isEqualTo(2);

    // assert both .vue and .ts files are analyzed

    // test added for https://github.com/SonarSource/SonarJS/issues/2626 but not actually testing it as order of analysis is not reliable
    // still we prefer to keep more real-life vue project with another file and tsconfig
    List<Issues.Issue> issuesList = getIssues(vueFileKey);
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getRule()).isEqualTo("typescript:S3923");

    issuesList = getIssues(projectKey + ":main.ts");
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getRule()).isEqualTo("typescript:S3923");
  }
}
