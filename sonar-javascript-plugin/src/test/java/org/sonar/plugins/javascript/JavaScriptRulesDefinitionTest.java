/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript;

import org.junit.Test;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.javascript.checks.CheckList;

import static org.fest.assertions.Assertions.assertThat;

public class JavaScriptRulesDefinitionTest {

  @Test
  public void test() {
    JavaScriptRulesDefinition rulesDefinition = new JavaScriptRulesDefinition();
    RulesDefinition.Context context = new RulesDefinition.Context();
    rulesDefinition.define(context);
    RulesDefinition.Repository repository = context.repository("javascript");

    assertThat(repository.name()).isEqualTo("SonarQube");
    assertThat(repository.language()).isEqualTo("js");
    assertThat(repository.rules()).hasSize(CheckList.getChecks().size());

    RulesDefinition.Rule alertUseRule = repository.rule("ArrayAndObjectConstructors");
    assertThat(alertUseRule).isNotNull();
    assertThat(alertUseRule.name()).isEqualTo("Array and Object constructors should not be used");
  }

}
