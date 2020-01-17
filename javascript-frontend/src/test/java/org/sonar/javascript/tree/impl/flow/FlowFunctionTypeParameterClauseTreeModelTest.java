/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.tree.impl.flow;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterClauseTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowFunctionTypeParameterClauseTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void one_parameter() throws Exception {
    FlowFunctionTypeParameterClauseTree tree = parse("(par1: string)", Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE, Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE)).isTrue();
    assertThat(tree.parameters().size()).isEqualTo(1);
    assertThat(tree.leftParenthesis().text()).isEqualTo("(");
    assertThat(tree.rightParenthesis().text()).isEqualTo(")");
  }

  @Test
  public void many_parameters() throws Exception {
    FlowFunctionTypeParameterClauseTree tree = parse("(par1: string, number, boolean)", Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE, Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE)).isTrue();
    assertThat(tree.parameters().size()).isEqualTo(3);
  }

  @Test
  public void zero_parameters() throws Exception {
    FlowFunctionTypeParameterClauseTree tree = parse("()", Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE, Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE)).isTrue();
    assertThat(tree.parameters()).isEmpty();
  }

  @Test
  public void rest_parameter() throws Exception {
    FlowFunctionTypeParameterClauseTree tree = parse("(...numbers: SomeArrayType)", Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE, Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE)).isTrue();
    assertThat(tree.parameters()).hasSize(1);
  }

}
