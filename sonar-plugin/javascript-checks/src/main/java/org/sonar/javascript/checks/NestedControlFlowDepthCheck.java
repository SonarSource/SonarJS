/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import org.sonar.plugins.javascript.api.TypeScriptRule;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S134")
@DeprecatedRuleKey(ruleKey = "NestedIfDepth")
public class NestedControlFlowDepthCheck implements EslintBasedCheck {

  private static final int DEFAULT_MAXIMUM_NESTING_LEVEL = 3;

  @RuleProperty(
    key = "maximumNestingLevel",
    description = "Maximum allowed \"if/for/while/switch/try\" statements nesting depth",
    defaultValue = "" + DEFAULT_MAXIMUM_NESTING_LEVEL
  )
  public int maximumNestingLevel = DEFAULT_MAXIMUM_NESTING_LEVEL;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(maximumNestingLevel);
  }

  @Override
  public String eslintKey() {
    return "nested-control-flow";
  }
}
