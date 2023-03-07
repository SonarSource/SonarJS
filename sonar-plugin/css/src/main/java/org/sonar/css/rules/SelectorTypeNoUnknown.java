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
package org.sonar.css.rules;

import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;

import static org.sonar.css.rules.RuleUtils.splitAndTrim;

@Rule(key = "S4670")
public class SelectorTypeNoUnknown implements CssRule {

  // prefixes for Angular Material (mat, md), Font Awesome (fa)
  private static final String DEFAULT_IGNORED_TYPES = "/^(mat|md|fa)-/";

  private static final String DEFAULT_IGNORE = "custom-elements";

  @RuleProperty(
    key = "ignoreTypes",
    description = "Comma-separated list of regular expressions for selector types to consider as valid.",
    defaultValue = "" + DEFAULT_IGNORED_TYPES)
  String ignoreTypes = DEFAULT_IGNORED_TYPES;

  @RuleProperty(
    key = "ignore",
    description = "Comma-separated list of ignored elements. The possible values are:\n" +
      "\"custom-elements\": Allow custom elements (e.g \"x-foo\").\n" +
      "\"default-namespace\": Allow unknown type selectors if they belong to the default namespace.",
    defaultValue = "" + DEFAULT_IGNORE)
  String ignore = DEFAULT_IGNORE;

  @Override
  public String stylelintKey() {
    return "selector-type-no-unknown";
  }

  @Override
  public List<Object> stylelintOptions() {
    return Arrays.asList(true, new StylelintIgnoreOption(splitAndTrim(ignoreTypes), splitAndTrim(ignore)));
  }

  private static class StylelintIgnoreOption {
    // Used by GSON serialization
    private final List<String> ignoreTypes;
    private final List<String> ignore;

    StylelintIgnoreOption(List<String> ignoreTypes, List<String> ignore) {
      this.ignoreTypes = ignoreTypes;
      this.ignore = ignore;
    }
  }
}
