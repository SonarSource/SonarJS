/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import java.io.File;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(OrchestratorStarter.class)
class ReferencedTSConfigTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private static final String PROJECT = "referenced-tsconfigs";
  private static final File PROJECT_DIR = TestUtils.projectDir(PROJECT);

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

    assertThat(buildResult.getLogsLines(l -> l.contains("INFO: TypeScript configuration file")))
      .hasSize(2);
  }
}
