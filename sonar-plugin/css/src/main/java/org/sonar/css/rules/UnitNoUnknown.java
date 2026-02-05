/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
package org.sonar.css.rules;

import static org.sonar.css.rules.RuleUtils.splitAndTrim;

import java.util.Arrays;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;

@Rule(key = "S4653")
public class UnitNoUnknown implements CssRule {

  private static final String DEFAULT_IGNORED_FUNCTIONS =
    "image-set, spacer, spacing, size, rem, em, fluid";

  @RuleProperty(
    key = "ignoreFunctions",
    description = "Comma-separated list of function names and/or regular expressions for functions whose arguments should be ignored.",
    defaultValue = "" + DEFAULT_IGNORED_FUNCTIONS
  )
  String ignoreFunctions = DEFAULT_IGNORED_FUNCTIONS;

  @Override
  public String stylelintKey() {
    return "unit-no-unknown";
  }

  @Override
  public List<Object> stylelintOptions() {
    return Arrays.asList(true, new StylelintIgnoreOption(splitAndTrim(ignoreFunctions)));
  }

  private static class StylelintIgnoreOption {

    // Used by GSON serialization
    private final List<String> ignoreFunctions;

    StylelintIgnoreOption(List<String> ignoreFunctions) {
      this.ignoreFunctions = ignoreFunctions;
    }
  }
}
