/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2022 SonarSource SA
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

import java.io.File;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@ExtendWith(OrchestratorStarter.class)
class ExternalTSConfigDependencyTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final String PROJECT = "external-tsconfig-dependency-project";
  private static final File PROJECT_DIR = TestUtils.projectDir(PROJECT);

  @Test
  void test() throws Exception {
    SonarScanner build = getSonarScanner()
      .setProjectKey(PROJECT)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    orchestrator.getServer().provisionProject(PROJECT, PROJECT);
    orchestrator.getServer().associateProjectToQualityProfile(PROJECT, "ts", "eslint-based-rules-profile");

    BuildResult buildResult = orchestrator.executeBuild(build);

    assertThat(getIssues(PROJECT)).extracting(Issue::getLine, Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, "external-tsconfig-dependency-project:src/bar/main.ts")
    );
    assertThat(buildResult.getLogsLines(l -> l.equals("WARN: At least one tsconfig was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details."))).hasSize(1);

    File rootDrive = PROJECT_DIR;
    while (rootDrive.getParentFile() != null) {
      rootDrive = rootDrive.getParentFile();
    }

    File lastTsConfigPath = new File(rootDrive, "node_modules" + File.separator + "@tsconfig" + File.separator + "node14" + File.separator + "tsconfig.json");

    assertThat(buildResult.getLogsLines(l -> l.equals("WARN: Could not find tsconfig: " + lastTsConfigPath.getAbsolutePath().replace('\\', '/') + "; falling back to an empty configuration."))).hasSize(1);
  }
}
