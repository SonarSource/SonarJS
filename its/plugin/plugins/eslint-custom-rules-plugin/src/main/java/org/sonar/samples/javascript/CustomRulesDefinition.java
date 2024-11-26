/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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
package org.sonar.samples.javascript;

import org.sonar.api.server.rule.RulesDefinition;

public class CustomRulesDefinition implements RulesDefinition {

  @Override
  public void define(Context context) {
    NewRepository repository = context
      .createRepository(RuleRepository.REPOSITORY_KEY, "js")
      .setName("ESLint Custom Rules");
    repository
      .createRule(CustomRule.RULE_KEY)
      .setName("ESLint Custom Rule")
      .setHtmlDescription("Description");
    repository.done();

    NewRepository tsRepository = context
      .createRepository(TsRepository.REPOSITORY_KEY, "ts")
      .setName("TypeScript Custom Rules");
    tsRepository
      .createRule(TsRule.RULE_KEY)
      .setName("TypeScript Custom Rule")
      .setHtmlDescription("Description");
    tsRepository.done();
  }
}
