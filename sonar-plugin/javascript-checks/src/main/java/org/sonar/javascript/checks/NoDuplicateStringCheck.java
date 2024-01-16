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

import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@TypeScriptRule
@JavaScriptRule
@Rule(key = "S1192")
public class NoDuplicateStringCheck implements EslintBasedCheck {

  private static final int DEFAULT_THRESHOLD = 3;
  private static final String DEFAULT_IGNORED_STRINGS = "application/json";

  @RuleProperty(
    key = "threshold",
    description = "Number of times a literal must be duplicated to trigger an issue.",
    defaultValue = "" + DEFAULT_THRESHOLD
  )
  int threshold = DEFAULT_THRESHOLD;

  @RuleProperty(
    key = "ignoreStrings",
    description = "Comma-separated list of strings that must be ignored.",
    defaultValue = "" + DEFAULT_IGNORED_STRINGS
  )
  String ignoreStrings = DEFAULT_IGNORED_STRINGS;

  @Override
  public List<Object> configurations() {
    return Arrays.asList(new Config(threshold, ignoreStrings));
  }

  @Override
  public String eslintKey() {
    return "no-duplicate-string";
  }

  private static class Config {

    public int threshold;
    public String ignoreStrings;

    public Config(int threshold, String ignoreStrings) {
      this.threshold = threshold;
      this.ignoreStrings = ignoreStrings;
    }
  }
}
