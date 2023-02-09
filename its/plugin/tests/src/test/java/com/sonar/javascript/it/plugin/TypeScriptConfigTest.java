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

import com.sonar.javascript.it.plugin.assertj.BuildResultAssert;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@ExtendWith(OrchestratorStarter.class)
class TypeScriptConfigTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;
  private static final String PROFILE = "typescript-config-profile";
  private static final String PROJECT_ROOT = "typescript-config";
  private static final String LANGUAGE = "ts";

  @Test
  void multiple_targets() {
    var project = "multiple-targets";
    var scanner = getSonarScanner(project);

    BuildResultAssert.assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 1 tsconfig.json file(s)")
      .logsOnce("INFO: Skipped 1 file(s) because they were not part of any tsconfig.json (enable debug logs to see the full list)");

    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":src/main.ts")
    );
    // Missing issues for main.test.ts

    var configuredBuild = scanner.setProperty("sonar.typescript.tsconfigPaths", "tsconfig.json,tsconfig.test.json");
    BuildResultAssert.assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("Found 2 TSConfig file(s)")
        .doesNotLog("INFO: Skipped");

    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":src/main.ts"),
      tuple(4, project + ":src/main.test.ts")
    );
  }

  @Test
  void extend_main_from_folder() {
    var project = "extend-main-from-folder";
    var scanner = getSonarScanner(project);

    BuildResultAssert.assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 2 tsconfig.json file(s)");

    assertThat(getIssues(project)).isEmpty();
    // Missing issues for main.ts

    var configuredBuild = scanner.setProperty("sonar.typescript.tsconfigPaths", "src/tsconfig.json");
    BuildResultAssert.assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("Found 1 TSConfig file(s)");

    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":src/main.ts")
    );
  }

  @Test
  void extend_base_from_folder() {
    var project = "extend-base-from-folder";
    var scanner = getSonarScanner(project);

    BuildResultAssert.assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 1 tsconfig.json file(s)");
    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":src/main.ts")
    );
  }

  @Test
  void monorepo() {
    var project = "monorepo";
    var scanner = getSonarScanner(project);

    BuildResultAssert.assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 2 tsconfig.json file(s)");
    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":project-1/main.ts"),
      tuple(4, project + ":project-2/main.ts")
    );
  }

  @Test
  void shared_base() {
    var project = "shared-base";
    var scanner = getSonarScanner(project);

    BuildResultAssert.assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 1 tsconfig.json file(s)");
    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":src/main.ts")
    );
  }

  private static SonarScanner getSonarScanner(String project) {
    var projectDir = TestUtils.projectDir(PROJECT_ROOT).toPath().resolve(project).toFile();

    orchestrator.getServer().provisionProject(project, project);
    orchestrator.getServer().associateProjectToQualityProfile(project, LANGUAGE, PROFILE);

    return OrchestratorStarter.getSonarScanner()
      .setProjectKey(project)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);
  }
}
