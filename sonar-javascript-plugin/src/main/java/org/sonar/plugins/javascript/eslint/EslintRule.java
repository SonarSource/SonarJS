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
package org.sonar.plugins.javascript.eslint;

import java.util.List;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import org.sonar.api.batch.fs.InputFile;

class EslintRule {
  static final String UCFG_ESLINT_KEY = "ucfg";

  final String key;
  final List<String> fileTypeTarget;
  final List<Object> configurations;

  EslintRule(String key, List<Object> configurations, List<InputFile.Type> fileTypeTarget) {
    this.key = key;
    this.fileTypeTarget = fileTypeTarget.stream().map(InputFile.Type::name).collect(Collectors.toList());
    this.configurations = configurations;
  }

  static boolean containsRuleWithKey(List<EslintRule> rules, String eslintKey) {
    return rules.stream().anyMatch(ruleMatcher(eslintKey));
  }

  static EslintRule findFirstRuleWithKey(List<EslintRule> rules, String eslintKey) {
    return rules.stream()
      .filter(ruleMatcher(eslintKey))
      .findFirst()
      .orElse(null);
  }

  private static Predicate<EslintRule> ruleMatcher(String eslintKey) {
    return rule -> rule.key.equals(eslintKey);
  }

  @Override
  public String toString() {
    return key;
  }
}
