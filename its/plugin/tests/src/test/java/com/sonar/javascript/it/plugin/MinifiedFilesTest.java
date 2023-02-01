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

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasureAsInt;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OrchestratorStarter.class)
class MinifiedFilesTest {

  private static final String PROJECT_KEY = "minifiedFilesTest";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @BeforeAll
  public static void prepare() {
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDir("minified_files"))
      .setProjectKey(PROJECT_KEY)
      .setProjectName(PROJECT_KEY)
      .setProjectVersion("1.0")
      .setSourceDirs("src");
    OrchestratorStarter.setEmptyProfile(PROJECT_KEY);
    orchestrator.executeBuild(build);
  }

  @Test
  void test() {
    assertThat(getMeasureAsInt(PROJECT_KEY, "functions")).isEqualTo(2);
    assertThat(getMeasureAsInt(PROJECT_KEY, "statements")).isEqualTo(1);
  }

  /* Helper methods */

}
