/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.annotations.TypeScriptRule;

@JavaScriptRule
@TypeScriptRule
@Rule(key = "S100")
public class FunctionNameCheck extends EslintBasedCheck {

  public static final String DEFAULT = "^[_a-z][a-zA-Z0-9]*$";

  @RuleProperty(
    key = "format",
    description = "Regular expression used to check the function names against.",
    defaultValue = "" + DEFAULT)
  public String format = DEFAULT;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(new Config(format));
  }

  @Override
  public String eslintKey() {
    return "function-name";
  }

  private static class Config {
    String format;

    Config(String format) {
      this.format = format;
    }
  }
}
