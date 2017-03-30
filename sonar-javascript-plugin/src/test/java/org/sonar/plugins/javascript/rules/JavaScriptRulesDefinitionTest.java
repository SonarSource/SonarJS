/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import org.junit.Test;
import org.sonar.api.rules.RuleType;
import org.sonar.api.server.debt.DebtRemediationFunction.Type;
import org.sonar.api.server.rule.RuleParamType;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.api.server.rule.RulesDefinition.Param;
import org.sonar.api.server.rule.RulesDefinition.Repository;
import org.sonar.api.server.rule.RulesDefinition.Rule;
import org.sonar.api.utils.Version;
import org.sonar.javascript.checks.CheckList;

import static org.assertj.core.api.Assertions.assertThat;

public class JavaScriptRulesDefinitionTest {

  @Test
  public void test() {
    RulesDefinition.Repository repository = buildRepository(Version.parse("5.6"));

    assertThat(repository.name()).isEqualTo("SonarAnalyzer");
    assertThat(repository.language()).isEqualTo("js");
    assertThat(repository.rules()).hasSize(CheckList.getChecks().size());

    assertRuleProperties(repository);
    assertParameterProperties(repository);
    assertAllRuleParametersHaveDescription(repository);
  }

  @Test
  public void sonarlint() {
    RulesDefinition.Repository repository = buildRepository(Version.parse("6.0"));
    assertThat(repository.rule("ContinueStatement").activatedByDefault()).isFalse();
    assertThat(repository.rule("S930").activatedByDefault()).isTrue();
  }

  private RulesDefinition.Repository buildRepository(Version sonarRuntimeVersion) {
    JavaScriptRulesDefinition rulesDefinition = new JavaScriptRulesDefinition(sonarRuntimeVersion);
    RulesDefinition.Context context = new RulesDefinition.Context();
    rulesDefinition.define(context);
    RulesDefinition.Repository repository = context.repository("javascript");
    return repository;
  }

  private void assertParameterProperties(Repository repository) {
    // TooManyLinesInFunctionCheck
    Param max = repository.rule("S138").param("max");
    assertThat(max).isNotNull();
    assertThat(max.defaultValue()).isEqualTo("100");
    assertThat(max.description()).isEqualTo("Maximum authorized lines in a function");
    assertThat(max.type()).isEqualTo(RuleParamType.INTEGER);
  }

  private void assertRuleProperties(Repository repository) {
    Rule rule = repository.rule("ArrayAndObjectConstructors");
    assertThat(rule).isNotNull();
    assertThat(rule.name()).isEqualTo("Array constructors should not be used");
    assertThat(rule.debtRemediationFunction().type()).isEqualTo(Type.CONSTANT_ISSUE);
    assertThat(rule.type()).isEqualTo(RuleType.BUG);
    assertThat(repository.rule("CommentRegularExpression").template()).isTrue();
  }

  private void assertAllRuleParametersHaveDescription(Repository repository) {
    for (Rule rule : repository.rules()) {
      for (Param param : rule.params()) {
        assertThat(param.description()).as("description for " + param.key()).isNotEmpty();
      }
    }
  }

}
