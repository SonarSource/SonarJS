/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.javascript.checks;

import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.Check;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S5843")
public class RegexComplexityCheck extends Check {

  private static final int DEFAULT_THRESHOLD = 20;

  @RuleProperty(
    key = "maxComplexity",
    description = "The maximum authorized complexity.",
    defaultValue = "" + DEFAULT_THRESHOLD
  )
  int threshold = DEFAULT_THRESHOLD;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(
      new Config(threshold)
    );
  }



  private static class Config {

    int threshold;

    Config(int threshold) {
      this.threshold = threshold;
    }
  }
}
