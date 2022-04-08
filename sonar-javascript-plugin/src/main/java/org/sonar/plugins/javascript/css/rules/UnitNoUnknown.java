/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
package org.sonar.plugins.javascript.css.rules;

import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;

import static org.sonar.plugins.javascript.css.rules.RuleUtils.splitAndTrim;

@Rule(key = "S4653")
public class UnitNoUnknown implements CssRule {

  private static final String DEFAULT_IGNORED_UNITS = "x";

  @RuleProperty(
    key = "ignoredUnits",
    description = "Comma-separated list of \"units\" to consider as valid.",
    defaultValue = "" + DEFAULT_IGNORED_UNITS)
  String ignoredUnits = DEFAULT_IGNORED_UNITS;

  @Override
  public String stylelintKey() {
    return "unit-no-unknown";
  }

  @Override
  public List<Object> stylelintOptions() {
    return Arrays.asList(true, new StylelintIgnoreOption(splitAndTrim(ignoredUnits)));
  }

  private static class StylelintIgnoreOption {
    // Used by GSON serialization
    private final List<String> ignoreUnits;

    StylelintIgnoreOption(List<String> ignoreUnits) {
      this.ignoreUnits = ignoreUnits;
    }
  }
}
