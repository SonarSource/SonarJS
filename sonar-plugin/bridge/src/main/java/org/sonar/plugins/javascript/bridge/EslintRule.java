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
package org.sonar.plugins.javascript.bridge;

import java.util.List;
import java.util.Set;
import java.util.function.Predicate;
import org.sonar.api.batch.fs.InputFile;

public class EslintRule {

  static final String UCFG_ESLINT_KEY = "ucfg";

  final String key;
  final List<String> fileTypeTarget;
  final List<Object> configurations;
  final String language;

  public EslintRule(
    String key,
    List<Object> configurations,
    List<InputFile.Type> fileTypeTarget,
    String language
  ) {
    this.key = key;
    this.fileTypeTarget = fileTypeTarget.stream().map(InputFile.Type::name).toList();
    this.configurations = configurations;
    // unfortunately we can't check this using types, so it's enforced at runtime
    if (!"js".equals(language) && !"ts".equals(language)) {
      throw new IllegalArgumentException("Invalid language " + language);
    }
    this.language = language;
  }

  @Override
  public String toString() {
    return key;
  }

  public String getKey() {
    return key;
  }

  public List<Object> getConfigurations() {
    return configurations;
  }

  static EslintRule findFirstRuleWithKey(List<EslintRule> rules, String eslintKey) {
    return rules.stream().filter(ruleMatcher(eslintKey)).findFirst().orElse(null);
  }

  static List<EslintRule> findAllBut(List<EslintRule> rules, Set<String> blackListRuleKeys) {
    return rules.stream().filter(rule -> !blackListRuleKeys.contains(rule.key)).toList();
  }

  private static Predicate<EslintRule> ruleMatcher(String eslintKey) {
    return rule -> rule.key.equals(eslintKey);
  }
}
