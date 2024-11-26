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
package org.sonar.css;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.sonar.api.SonarRuntime;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.rules.RuleType;
import org.sonar.api.server.debt.DebtRemediationFunction.Type;
import org.sonar.api.server.rule.RuleParamType;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.api.server.rule.RulesDefinition.Param;
import org.sonar.api.server.rule.RulesDefinition.Repository;
import org.sonar.api.server.rule.RulesDefinition.Rule;
import org.sonar.api.utils.Version;

class CssRulesDefinitionTest {

  private static final SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarLint(
    Version.create(9, 3)
  );

  @Test
  void test_repos() {
    CssRulesDefinition rulesDefinition = new CssRulesDefinition(sonarRuntime);
    RulesDefinition.Context context = new RulesDefinition.Context();
    rulesDefinition.define(context);

    assertThat(context.repositories()).hasSize(2);
    RulesDefinition.Repository mainRepository = context.repository("css");
    RulesDefinition.Repository externalRepository = context.repository("external_stylelint");

    assertThat(externalRepository.name()).isEqualTo("stylelint");
    assertThat(externalRepository.language()).isEqualTo("css");
    assertThat(externalRepository.isExternal()).isTrue();
    assertThat(externalRepository.rules()).hasSize(170);

    assertThat(mainRepository.name()).isEqualTo("SonarQube");
    assertThat(mainRepository.language()).isEqualTo("css");
    assertThat(mainRepository.isExternal()).isFalse();
    assertThat(mainRepository.rules()).hasSize(CssRules.getRuleClasses().size());
  }

  @Test
  void test_main_repo() {
    RulesDefinition.Repository repository = buildRepository(
      "css",
      new CssRulesDefinition(sonarRuntime)
    );

    assertRuleProperties(repository);
    assertParameterProperties(repository);
    assertAllRuleParametersHaveDescription(repository);
  }

  private void assertRuleProperties(Repository repository) {
    Rule rule = repository.rule("S4647");
    assertThat(rule).isNotNull();
    assertThat(rule.name()).isEqualTo("Color definitions should be valid");
    assertThat(rule.debtRemediationFunction().type()).isEqualTo(Type.CONSTANT_ISSUE);
    assertThat(rule.type()).isEqualTo(RuleType.BUG);
  }

  private void assertParameterProperties(Repository repository) {
    // AtRuleNoUnknown
    Param param = repository.rule("S4662").param("ignoreAtRules");
    assertThat(param).isNotNull();
    assertThat(param.defaultValue()).startsWith("value,at-root,content");
    assertThat(param.description())
      .isEqualTo("Comma-separated list of \"at-rules\" to consider as valid.");
    assertThat(param.type()).isEqualTo(RuleParamType.STRING);
  }

  private void assertAllRuleParametersHaveDescription(Repository repository) {
    for (Rule rule : repository.rules()) {
      for (Param param : rule.params()) {
        assertThat(param.description()).as("description for " + param.key()).isNotEmpty();
      }
    }
  }

  static RulesDefinition.Repository buildRepository(
    String repositoryKey,
    RulesDefinition rulesDefinition
  ) {
    RulesDefinition.Context context = new RulesDefinition.Context();
    rulesDefinition.define(context);
    return context.repository(repositoryKey);
  }
}
