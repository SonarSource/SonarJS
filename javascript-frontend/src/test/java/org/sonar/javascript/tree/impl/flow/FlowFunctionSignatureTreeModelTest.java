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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionSignatureTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FlowFunctionSignatureTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    FlowFunctionSignatureTree tree = parse("declare function foo(): void;", Kind.FLOW_FUNCTION_SIGNATURE);

    assertThat(tree.is(Kind.FLOW_FUNCTION_SIGNATURE)).isTrue();
    assertThat(tree.functionToken().text()).isEqualTo("function");
    assertThat(tree.name().name()).isEqualTo("foo");
    assertThat(tree.parameterClause().parameters()).hasSize(0);
    assertThat(tree.returnType().type().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();
  }

  @Test
  public void explicit_and_implicit_parameter_names() throws Exception {
    FlowFunctionSignatureTree tree = parse("declare function foo<T>(name:string, string): void;", Kind.FLOW_FUNCTION_SIGNATURE);

    assertThat(tree.is(Kind.FLOW_FUNCTION_SIGNATURE)).isTrue();
    assertThat(tree.parameterClause().parameters()).hasSize(2);
    assertThat(tree.genericParameterClause().genericParameters()).hasSize(1);
    assertThat(tree.parameterClause().parameters().get(0).is(Kind.FLOW_FUNCTION_TYPE_PARAMETER)).isTrue();
    assertThat(tree.parameterClause().parameters().get(1).is(Kind.FLOW_FUNCTION_TYPE_PARAMETER)).isTrue();
    assertThat(tree.returnType().type().is(Kind.FLOW_SIMPLE_TYPE)).isTrue();
  }

}
