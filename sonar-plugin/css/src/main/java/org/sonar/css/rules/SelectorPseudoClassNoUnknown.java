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

import static org.sonar.css.rules.RuleUtils.splitAndTrim;

import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;

@Rule(key = "S4659")
public class SelectorPseudoClassNoUnknown implements CssRule {

  private static final String DEFAULT_IGNORED_PSEUDO_CLASSES = "local,global,export,import,deep";

  @RuleProperty(
    key = "ignorePseudoClasses",
    description = "Comma-separated list of strings and/or regular expressions for pseudo classes to consider as valid.",
    defaultValue = "" + DEFAULT_IGNORED_PSEUDO_CLASSES
  )
  String ignoredPseudoClasses = DEFAULT_IGNORED_PSEUDO_CLASSES;

  @Override
  public String stylelintKey() {
    return "selector-pseudo-class-no-unknown";
  }

  @Override
  public List<Object> stylelintOptions() {
    return Arrays.asList(true, new StylelintIgnoreOption(splitAndTrim(ignoredPseudoClasses)));
  }

  private static class StylelintIgnoreOption {

    // Used by GSON serialization
    private final List<String> ignorePseudoClasses;

    StylelintIgnoreOption(List<String> ignorePseudoClasses) {
      this.ignorePseudoClasses = ignorePseudoClasses;
    }
  }
}
