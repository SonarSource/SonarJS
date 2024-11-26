/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

@Rule(key = "S4654")
public class PropertyNoUnknown implements CssRule {

  private static final String DEFAULT_IGNORED_PROPERTIES = "composes, /^mso-/";
  private static final String DEFAULT_IGNORED_SELECTORS = "/^:export.*/, /^:import.*/";

  @RuleProperty(
    key = "ignoreTypes",
    description = "Comma-separated list of strings and/or regular expressions for properties to consider as valid.",
    defaultValue = "" + DEFAULT_IGNORED_PROPERTIES
  )
  String ignoreProperties = DEFAULT_IGNORED_PROPERTIES;

  @RuleProperty(
    key = "ignoreSelectors",
    description = "Comma-separated list of strings and/or regular expressions for selectors to consider as valid.",
    defaultValue = "" + DEFAULT_IGNORED_SELECTORS
  )
  String ignoreSelectors = DEFAULT_IGNORED_SELECTORS;

  @Override
  public String stylelintKey() {
    return "property-no-unknown";
  }

  @Override
  public List<Object> stylelintOptions() {
    return Arrays.asList(
      true,
      new StylelintIgnoreOption(splitAndTrim(ignoreProperties), splitAndTrim(ignoreSelectors))
    );
  }

  private static class StylelintIgnoreOption {

    // Used by GSON serialization
    private final List<String> ignoreProperties;
    private final List<String> ignoreSelectors;

    private StylelintIgnoreOption(List<String> ignoreProperties, List<String> ignoreSelectors) {
      this.ignoreProperties = ignoreProperties;
      this.ignoreSelectors = ignoreSelectors;
    }
  }
}
