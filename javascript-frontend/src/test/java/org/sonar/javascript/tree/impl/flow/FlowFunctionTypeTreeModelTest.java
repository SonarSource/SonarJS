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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowUnionTypeTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowFunctionTypeTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowFunctionTypeTree tree = parse("function foo(callback : <T>(par1: string) => void) {}", Tree.Kind.FLOW_FUNCTION_TYPE);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE)).isTrue();
    assertThat(tree.genericParameterClause()).isNotNull();
    assertThat(tree.doubleArrowToken().text()).isEqualTo("=>");
    assertThat(tree.parameterClause().is(Tree.Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE)).isTrue();
    assertThat(tree.returnType().is(Tree.Kind.FLOW_SIMPLE_TYPE)).isTrue();
  }

  @Test
  public void unparethensized_parameter() throws Exception {
    FlowFunctionTypeTree tree = parse("string => string", Tree.Kind.FLOW_FUNCTION_TYPE, Tree.Kind.FLOW_FUNCTION_TYPE);

    assertThat(tree.is(Tree.Kind.FLOW_FUNCTION_TYPE)).isTrue();
    assertThat(tree.parameterClause().parameters().size()).isEqualTo(1);
    assertThat(tree.parameterClause().leftParenthesis()).isNull();
    assertThat(tree.parameterClause().rightParenthesis()).isNull();
  }

  @Test
  public void unparethensized_union_parameter() throws Exception {
    FlowUnionTypeTree tree = parse("string | number => string", Kind.FLOW_UNION_TYPE, Kind.FLOW_UNION_TYPE);

    assertThat(tree.is(Tree.Kind.FLOW_UNION_TYPE)).isTrue();
    FlowFunctionTypeTree functionType = (FlowFunctionTypeTree) tree.subTypes().get(1);
    assertThat(functionType.parameterClause().parameters().size()).isEqualTo(1);
    // See #778 to understand why this is wrong
    assertThat(functionType.parameterClause().parameters().get(0).type().is(Tree.Kind.FLOW_UNION_TYPE)).isFalse();
  }


}
