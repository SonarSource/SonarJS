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
package org.sonar.javascript.tree.impl.expression;

import org.junit.Test;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FunctionExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void named() throws Exception {
    FunctionExpressionTree tree = parse("a = function f() {}", Kind.FUNCTION_EXPRESSION);

    assertThat(tree.is(Kind.FUNCTION_EXPRESSION)).isTrue();
    assertThat(tree.functionKeyword().text()).isEqualTo(JavaScriptKeyword.FUNCTION.getValue());
    assertThat(tree.name().name()).isEqualTo("f");
    assertThat(tree.parameterClause().is(Kind.PARAMETER_LIST)).isTrue();
    assertThat(tree.returnType()).isNull();
    assertThat(tree.body()).isNotNull();
  }

  @Test
  public void not_named() throws Exception {
    FunctionExpressionTree tree = parse("a = function () {}", Kind.FUNCTION_EXPRESSION);

    assertThat(tree.is(Kind.FUNCTION_EXPRESSION)).isTrue();
    assertThat(tree.functionKeyword().text()).isEqualTo(JavaScriptKeyword.FUNCTION.getValue());
    assertThat(tree.name()).isNull();
    assertThat(tree.parameterClause().is(Kind.PARAMETER_LIST)).isTrue();
    assertThat(tree.body()).isNotNull();
  }

  @Test
  public void async() throws Exception {
    FunctionExpressionTree tree = parse("a = async function f() {}", Kind.FUNCTION_EXPRESSION);
    assertThat(tree.asyncToken().text()).isEqualTo("async");

    tree = parse("a = function f() {}", Kind.FUNCTION_EXPRESSION);
    assertThat(tree.asyncToken()).isNull();
  }

  @Test
  public void flow_typed() throws Exception {
    FunctionExpressionTree tree = parse("a = function f<T>(): void {}", Kind.FUNCTION_EXPRESSION);
    assertThat(tree.is(Kind.FUNCTION_EXPRESSION)).isTrue();
    assertThat(tree.genericParameterClause()).isNotNull();
    assertThat(tree.returnType()).isNotNull();
  }
}
