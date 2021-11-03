/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.css.plugin;

import org.junit.Test;
import org.sonar.api.server.rule.RulesDefinition;

import static org.assertj.core.api.Assertions.assertThat;

public class CssRulesDefinitionTest {

  @Test
  public void test_with_external_rules() {
    CssRulesDefinition rulesDefinition = new CssRulesDefinition();
    RulesDefinition.Context context = new RulesDefinition.Context();
    rulesDefinition.define(context);

    assertThat(context.repositories()).hasSize(2);
    RulesDefinition.Repository mainRepository = context.repository("css");
    RulesDefinition.Repository externalRepository = context.repository("external_stylelint");

    assertThat(externalRepository.name()).isEqualTo("stylelint");
    assertThat(externalRepository.language()).isEqualTo("css");
    assertThat(externalRepository.isExternal()).isEqualTo(true);
    assertThat(externalRepository.rules()).hasSize(170);

    assertThat(mainRepository.name()).isEqualTo("SonarAnalyzer");
    assertThat(mainRepository.language()).isEqualTo("css");
    assertThat(mainRepository.isExternal()).isEqualTo(false);
    assertThat(mainRepository.rules()).hasSize(CssRules.getRuleClasses().size());
  }
}
