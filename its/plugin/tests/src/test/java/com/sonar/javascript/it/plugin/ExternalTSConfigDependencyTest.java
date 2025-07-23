/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

@ExtendWith(OrchestratorStarter.class)
class ExternalTSConfigDependencyTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final String PROJECT = "external-tsconfig-dependency-project";
  private static final File PROJECT_DIR = TestUtils.projectDirNoCopy(PROJECT);

  @Test
  void test() throws Exception {
    SonarScanner build = getSonarScanner()
      .setProjectKey(PROJECT)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(PROJECT_DIR);

    orchestrator.getServer().provisionProject(PROJECT, PROJECT);
    orchestrator
      .getServer()
      .associateProjectToQualityProfile(PROJECT, "ts", "eslint-based-rules-profile");

    BuildResult buildResult = orchestrator.executeBuild(build);

    assertThat(getIssues(PROJECT))
      .extracting(Issue::getLine, Issue::getComponent)
      .containsExactlyInAnyOrder(tuple(4, "external-tsconfig-dependency-project:src/bar/main.ts"));
    assertThat(
      buildResult.getLogsLines(l ->
        l.equals(
          "WARN: At least one referenced/extended tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details."
        )
      )
    ).hasSize(1);

    File rootDrive = PROJECT_DIR;
    while (rootDrive.getParentFile() != null) {
      rootDrive = rootDrive.getParentFile();
    }

    File lastTsConfigPath = new File(
      rootDrive,
      "node_modules" + File.separator + "__missing__" + File.separator + "tsconfig.json"
    );

    assertThat(
      buildResult.getLogsLines(l ->
        l.equals(
          "WARN: Could not find tsconfig.json: " +
          lastTsConfigPath.getAbsolutePath().replace('\\', '/') +
          "; falling back to an empty configuration."
        )
      )
    ).hasSize(1);
  }
}
