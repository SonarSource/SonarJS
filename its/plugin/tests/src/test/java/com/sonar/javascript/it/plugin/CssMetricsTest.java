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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasure;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getMeasureAsDouble;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(OrchestratorStarter.class)
class CssMetricsTest {

  private static final String PROJECT_KEY = "css-metrics-project";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @BeforeAll
  public static void prepare() {
    orchestrator.executeBuild(CssTestsUtils.createScanner(PROJECT_KEY));
  }

  @Test
  void test() {
    assertThat(getMeasureAsDouble(PROJECT_KEY, "lines")).isEqualTo(89);
    assertThat(getMeasureAsDouble(PROJECT_KEY, "ncloc")).isEqualTo(58);
    assertThat(getMeasure(PROJECT_KEY, "ncloc_language_distribution").getValue()).isEqualTo(
      "css=27;php=1;web=30"
    );
    assertThat(getMeasureAsDouble(PROJECT_KEY, "comment_lines")).isEqualTo(6);
  }
}
