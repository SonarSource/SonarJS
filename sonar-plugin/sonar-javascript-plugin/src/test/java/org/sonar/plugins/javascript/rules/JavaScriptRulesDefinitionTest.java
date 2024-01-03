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
package org.sonar.plugins.javascript.rules;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.sonar.api.SonarRuntime;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.rules.RuleType;
import org.sonar.api.server.debt.DebtRemediationFunction.Type;
import org.sonar.api.server.rule.RuleParamType;
import org.sonar.api.server.rule.RulesDefinition.Param;
import org.sonar.api.server.rule.RulesDefinition.Repository;
import org.sonar.api.server.rule.RulesDefinition.Rule;
import org.sonar.api.utils.Version;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.TestUtils;

class JavaScriptRulesDefinitionTest {

  private static final SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarLint(
    Version.create(9, 3)
  );

  @Test
  void test() {
    Repository repository = TestUtils.buildRepository(
      "javascript",
      new JavaScriptRulesDefinition(sonarRuntime)
    );

    assertThat(repository.name()).isEqualTo("Sonar");
    assertThat(repository.language()).isEqualTo("js");
    assertThat(repository.rules()).hasSize(CheckList.getJavaScriptChecks().size());

    assertRuleProperties(repository);
    assertParameterProperties(repository);
    assertAllRuleParametersHaveDescription(repository);
    assertSecurityStandards(repository);
  }

  @Test
  void sonarlint() {
    Repository repository = TestUtils.buildRepository(
      "javascript",
      new JavaScriptRulesDefinition(sonarRuntime)
    );
    assertThat(repository.rule("S909").activatedByDefault()).isFalse();
    assertThat(repository.rule("S930").activatedByDefault()).isTrue();
  }

  private void assertSecurityStandards(Repository repository) {
    Rule rule = repository.rule("S5736");
    assertThat(rule).isNotNull();
    assertThat(rule.securityStandards())
      .containsExactly("cwe:200", "owaspTop10-2021:a1", "owaspTop10:a3");
  }

  private void assertParameterProperties(Repository repository) {
    // TooManyLinesInFunctionCheck
    Param max = repository.rule("S138").param("max");
    assertThat(max).isNotNull();
    assertThat(max.defaultValue()).isEqualTo("200");
    assertThat(max.description()).isEqualTo("Maximum authorized lines in a function");
    assertThat(max.type()).isEqualTo(RuleParamType.INTEGER);
  }

  private void assertRuleProperties(Repository repository) {
    Rule rule = repository.rule("S1528");
    assertThat(rule).isNotNull();
    assertThat(rule.name()).isEqualTo("Array constructors should not be used");
    assertThat(rule.debtRemediationFunction().type()).isEqualTo(Type.CONSTANT_ISSUE);
    assertThat(rule.type()).isEqualTo(RuleType.CODE_SMELL);
    assertThat(repository.rule("S124").template()).isTrue();
  }

  private void assertAllRuleParametersHaveDescription(Repository repository) {
    for (Rule rule : repository.rules()) {
      for (Param param : rule.params()) {
        assertThat(param.description()).as("description for " + param.key()).isNotEmpty();
      }
    }
  }
}
