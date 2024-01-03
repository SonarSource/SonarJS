/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasureAsDouble;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(OrchestratorStarter.class)
class CssMinifiedTest {

  private static final String PROJECT_KEY = "css-minified-project";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @BeforeAll
  public static void prepare() {
    orchestrator.executeBuild(CssTestsUtils.createScanner(PROJECT_KEY));
  }

  @Test
  void test() {
    assertThat(getMeasureAsDouble(PROJECT_KEY, "files")).isEqualTo(1);
  }
}
