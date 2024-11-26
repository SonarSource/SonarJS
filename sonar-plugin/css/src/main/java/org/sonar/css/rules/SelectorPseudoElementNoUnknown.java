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

@Rule(key = "S4660")
public class SelectorPseudoElementNoUnknown implements CssRule {

  private static final String DEFAULT_IGNORE_PSEUDO_ELEMENTS = "ng-deep,v-deep,deep";

  @Override
  public String stylelintKey() {
    return "selector-pseudo-element-no-unknown";
  }

  @RuleProperty(
    key = "ignorePseudoElements",
    description = "Comma-separated list of regular expressions or strings to ignore (e.g. /^custom-/).",
    defaultValue = "" + DEFAULT_IGNORE_PSEUDO_ELEMENTS
  )
  String ignorePseudoElements = DEFAULT_IGNORE_PSEUDO_ELEMENTS;

  @Override
  public List<Object> stylelintOptions() {
    return Arrays.asList(
      true,
      new StylelintIgnorePseudoElementsOption(splitAndTrim(ignorePseudoElements))
    );
  }

  private static class StylelintIgnorePseudoElementsOption {

    // Used by GSON serialization
    private final List<String> ignorePseudoElements;

    StylelintIgnorePseudoElementsOption(List<String> ignorePseudoElements) {
      this.ignorePseudoElements = ignorePseudoElements;
    }
  }
}
