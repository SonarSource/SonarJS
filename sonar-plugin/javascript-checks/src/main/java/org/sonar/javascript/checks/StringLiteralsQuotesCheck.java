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

import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.Check;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@TypeScriptRule
@DeprecatedRuleKey(ruleKey = "SingleQuote")
@Rule(key = "S1441")
public class StringLiteralsQuotesCheck extends Check {

  private static final boolean DEFAULT = true;

  @RuleProperty(
    key = "singleQuotes",
    description = "Set to true to require single quotes, false for double quotes.",
    defaultValue = "" + DEFAULT
  )
  public boolean singleQuotes = DEFAULT;

  @Override
  public List<Object> configurations() {
    return Arrays.asList(singleQuotes ? "single" : "double", new Config());
  }



  private static class Config {

    boolean avoidEscape = true;
    boolean allowTemplateLiterals = true;
  }
}
