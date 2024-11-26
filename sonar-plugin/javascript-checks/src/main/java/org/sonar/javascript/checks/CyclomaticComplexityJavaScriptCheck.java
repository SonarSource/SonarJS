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
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

// This rule is duplicated for TypeScript because both rules actually map to the
// same eslint key while defining a different name for the same rule property.

@JavaScriptRule
@DeprecatedRuleKey(ruleKey = "FunctionComplexity")
@Rule(key = "S1541")
public class CyclomaticComplexityJavaScriptCheck extends Check {

  private static final int DEFAULT_THRESHOLD = 10;

  @RuleProperty(
    key = "maximumFunctionComplexityThreshold",
    description = "The maximum authorized complexity in function",
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
