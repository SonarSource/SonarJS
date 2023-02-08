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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@ExtendWith(OrchestratorStarter.class)
class TypeScriptConfigTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;
  private static final String PROFILE = "typescript-config-profile";
  private static final String PROJECT_ROOT = "typescript-config";

  @Test
  void multiple_targets() {
    var project = "multiple-targets";
    var projectRoot = TestUtils.projectDir(PROJECT_ROOT).toPath();
    var projectDir = projectRoot.resolve(project).toFile();

    orchestrator.getServer().provisionProject(project, project);
    orchestrator.getServer().associateProjectToQualityProfile(project, "ts", PROFILE);

    var defaultBuild = getSonarScanner()
      .setProjectKey(project)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);
    BuildResultAssert.assertThat(orchestrator.executeBuild(defaultBuild))
      .logsOnce("Found 1 tsconfig.json file(s)")
      .logsOnce("INFO: Skipped 1 file(s) because they were not part of any tsconfig.json (enable debug logs to see the full list)");

    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":src/main.ts")
    );
    // Missing issues for main.test.ts

    var configuredBuild = defaultBuild.setProperty("sonar.typescript.tsconfigPaths", "tsconfig.json,tsconfig.test.json");
    BuildResultAssert.assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("Found 2 TSConfig file(s)")
        .doesNotLog("INFO: Skipped");

    assertThat(getIssues(project)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, project + ":src/main.ts"),
      tuple(4, project + ":src/main.test.ts")
    );
  }
}
