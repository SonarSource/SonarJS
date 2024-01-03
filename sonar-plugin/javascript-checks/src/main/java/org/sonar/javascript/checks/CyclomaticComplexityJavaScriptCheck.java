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
package org.sonar.javascript.checks;

import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

// This rule is duplicated for TypeScript because both rules actually map to the
// same eslint key while defining a different name for the same rule property.

@JavaScriptRule
@DeprecatedRuleKey(ruleKey = "FunctionComplexity")
@Rule(key = "S1541")
public class CyclomaticComplexityJavaScriptCheck implements EslintBasedCheck {

  private static final int DEFAULT_THRESHOLD = 10;

  @RuleProperty(
    key = "maximumFunctionComplexityThreshold",
    description = "The maximum authorized complexity in function",
    defaultValue = "" + DEFAULT_THRESHOLD
  )
  int threshold = DEFAULT_THRESHOLD;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(threshold);
  }

  @Override
  public String eslintKey() {
    return "cyclomatic-complexity";
  }
}
