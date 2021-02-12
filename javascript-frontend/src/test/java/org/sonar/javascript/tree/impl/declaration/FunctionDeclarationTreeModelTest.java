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
package org.sonar.javascript.tree.impl.declaration;

import org.junit.Test;
import org.sonar.javascript.parser.EcmaScriptLexer;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;

import static org.assertj.core.api.Assertions.assertThat;

public class FunctionDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void function() throws Exception {
    FunctionDeclarationTree tree = parse("function f() {}", Kind.FUNCTION_DECLARATION);

    assertThat(tree.is(Kind.FUNCTION_DECLARATION)).isTrue();
    assertThat(tree.functionKeyword().text()).isEqualTo("function");
    assertThat(tree.starToken()).isNull();
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.returnType()).isNull();
    assertThat(tree.body()).isNotNull();
  }


  @Test
  public void generator() throws Exception {
    FunctionDeclarationTree tree = parse("function* g() {}", Kind.GENERATOR_DECLARATION);

    assertThat(tree.is(Kind.GENERATOR_DECLARATION)).isTrue();
    assertThat(tree.functionKeyword().text()).isEqualTo("function");
    assertThat(tree.starToken()).isNotNull();
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.body()).isNotNull();
  }

  @Test
  public void async() throws Exception {
    String function = "function f() {}";

    FunctionDeclarationTree tree = parse("async " + function, Kind.FUNCTION_DECLARATION, EcmaScriptLexer.STATEMENT);
    assertThat(tree.asyncToken().text()).isEqualTo("async");

    tree = parse(function, Kind.FUNCTION_DECLARATION);
    assertThat(tree.asyncToken()).isNull();
  }

  @Test
  public void flow_typed() throws Exception {
    FunctionDeclarationTree tree = parse("function f<T>(): void {}", Kind.FUNCTION_DECLARATION);
    assertThat(tree.genericParameterClause()).isNotNull();
    assertThat(tree.returnType()).isNotNull();
  }
}
