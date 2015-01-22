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
package org.sonar.javascript.model.expression;

import static org.fest.assertions.Assertions.assertThat;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

public class ArrowFunctionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void single_no_parenthesis_parameter_and_expression_body() throws Exception {
    ArrowFunctionTree tree = parse("p => p;", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters().is(Kind.IDENTIFIER));
    assertThat(((IdentifierTree) tree.parameters()).name()).isEqualTo("p");
    assertThat(tree.doubleArrow().text()).isEqualTo("=>");
    assertThat(expressionToString(tree.conciseBody())).isEqualTo("p");
  }

  @Test
  public void single_no_parenthesis_parameter_and_block_body() throws Exception {
    ArrowFunctionTree tree = parse("p => {};", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters().is(Kind.IDENTIFIER));
    assertThat(((IdentifierTree) tree.parameters()).name()).isEqualTo("p");
    assertThat(tree.doubleArrow().text()).isEqualTo(EcmaScriptPunctuator.DOUBLEARROW.getValue());
    assertThat(tree.conciseBody().is(Kind.BLOCK)).isTrue();
  }

  @Test
  public void multiple_parameters_and_expression_body() throws Exception {
    ArrowFunctionTree tree = parse("(p1, p2) => p;", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters().is(Kind.FORMAL_PARAMETER_LIST));
    assertThat(tree.doubleArrow().text()).isEqualTo(EcmaScriptPunctuator.DOUBLEARROW.getValue());
    assertThat(expressionToString(tree.conciseBody())).isEqualTo("p");
  }

  @Test
  public void multple_parameters_and_block_body() throws Exception {
    // TODO: to complete when concise body and parameter list are fully supported
    ArrowFunctionTree tree = parse("(p1, p2) => p;", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters().is(Kind.FORMAL_PARAMETER_LIST));
    assertThat(tree.doubleArrow().text()).isEqualTo(EcmaScriptPunctuator.DOUBLEARROW.getValue());
    assertThat(expressionToString(tree.conciseBody())).isEqualTo("p");
  }

}
