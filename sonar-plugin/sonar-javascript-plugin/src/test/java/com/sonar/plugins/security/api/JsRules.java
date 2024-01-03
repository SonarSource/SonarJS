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
