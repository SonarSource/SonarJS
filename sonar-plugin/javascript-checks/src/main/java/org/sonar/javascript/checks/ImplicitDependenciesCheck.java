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
import java.util.Collections;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.plugins.javascript.api.EslintBasedCheck;
import org.sonar.plugins.javascript.api.TypeScriptRule;

@TypeScriptRule
@Rule(key = "S4328")
public class ImplicitDependenciesCheck implements EslintBasedCheck {

  private static final String DEFAULT = "";

  @RuleProperty(
    key = "whitelist",
    description = "Comma separated list of modules to ignore while checking in package.json.",
    defaultValue = "" + DEFAULT
  )
  public String whitelist = DEFAULT;

  @Override
  public List<Object> configurations() {
    return Collections.singletonList(
      new Config(
        Arrays.stream(whitelist.split(","))
          .map(String::trim)
          .toArray(String[]::new)
      )
    );
  }

  @Override
  public String eslintKey() {
    return "no-implicit-dependencies";
  }

  private static class Config {

    String[] whitelist;

    Config(String[] whitelist) {
      this.whitelist = whitelist;
    }
  }
}
