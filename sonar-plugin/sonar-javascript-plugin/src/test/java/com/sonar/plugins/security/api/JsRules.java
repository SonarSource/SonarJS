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
package com.sonar.plugins.security.api;

import java.util.HashSet;
import java.util.Set;
import org.sonar.api.rule.RuleKey;

public class JsRules {

  public static final Set<RuleKey> JS_RULES = new HashSet<>();
  public static final Set<RuleKey> TS_RULES = new HashSet<>();

  public static Set<RuleKey> getSecurityRuleKeys(String language) {
    switch (language) {
      case "js":
        return JS_RULES;
      case "ts":
        return TS_RULES;
      default:
        throw new IllegalArgumentException("wrong language");
    }
  }

  public static void clear() {
    JS_RULES.clear();
    TS_RULES.clear();
  }
}
