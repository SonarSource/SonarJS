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
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S134")
@DeprecatedRuleKey(ruleKey = "NestedIfDepth")
public class NestedControlFlowDepthCheck extends Check {

  private static final int DEFAULT_MAXIMUM_NESTING_LEVEL = 3;

  @RuleProperty(
    key = "maximumNestingLevel",
    description = "Maximum allowed \"if/for/while/switch/try\" statements nesting depth",
    defaultValue = "" + DEFAULT_MAXIMUM_NESTING_LEVEL
  )
  public int maximumNestingLevel = DEFAULT_MAXIMUM_NESTING_LEVEL;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config(maximumNestingLevel));
  }

  

  private static class Config {

    int maximumNestingLevel;

    Config(int maximumNestingLevel) {
      this.maximumNestingLevel = maximumNestingLevel;
    }
  }
}
