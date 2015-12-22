/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import java.util.List;
import org.junit.Test;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.fest.assertions.Assertions.assertThat;

public class ArrowFunctionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void single_no_parenthesis_parameter_and_expression_body() throws Exception {
    ArrowFunctionTree tree = parse("p => p;", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters() instanceof IdentifierTree).isTrue();
    assertThat(((IdentifierTree) tree.parameters()).name()).isEqualTo("p");
    assertThat(tree.doubleArrow().text()).isEqualTo("=>");
    assertThat(expressionToString(tree.conciseBody())).isEqualTo("p");
  }

  @Test
  public void single_no_parenthesis_parameter_and_block_body() throws Exception {
    ArrowFunctionTree tree = parse("p => {};", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters() instanceof IdentifierTree).isTrue();
    assertThat(((IdentifierTree) tree.parameters()).name()).isEqualTo("p");
    assertThat(tree.doubleArrow().text()).isEqualTo(JavaScriptPunctuator.DOUBLEARROW.getValue());
    assertThat(tree.conciseBody().is(Kind.BLOCK)).isTrue();
  }

  @Test
  public void multiple_parameters_and_expression_body() throws Exception {
    ArrowFunctionTree tree = parse("(p1, p2) => p;", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters().is(Kind.FORMAL_PARAMETER_LIST)).isTrue();
    assertThat(tree.doubleArrow().text()).isEqualTo(JavaScriptPunctuator.DOUBLEARROW.getValue());
    assertThat(expressionToString(tree.conciseBody())).isEqualTo("p");
  }

  @Test
  public void multple_parameters_and_block_body() throws Exception {
    ArrowFunctionTree tree = parse("(p1, p2) => p;", Kind.ARROW_FUNCTION);

    assertThat(tree.is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(tree.parameters().is(Kind.FORMAL_PARAMETER_LIST)).isTrue();
    assertThat(tree.doubleArrow().text()).isEqualTo(JavaScriptPunctuator.DOUBLEARROW.getValue());
    assertThat(expressionToString(tree.conciseBody())).isEqualTo("p");
  }

  @Test
  public void parameterIdentifiers() throws Exception {
    ArrowFunctionTree tree = parse("(p1, p2) => p;", Kind.ARROW_FUNCTION);

    List<IdentifierTree> parameters = ((ArrowFunctionTreeImpl) tree).parameterIdentifiers();
    assertThat(parameters.size()).isEqualTo(2);
    assertThat(parameters.get(0).name()).isEqualTo("p1");
    assertThat(parameters.get(1).name()).isEqualTo("p2");

    tree = parse("p1 => p;", Kind.ARROW_FUNCTION);

    parameters = ((ArrowFunctionTreeImpl) tree).parameterIdentifiers();
    assertThat(parameters.size()).isEqualTo(1);
    assertThat(parameters.get(0).name()).isEqualTo("p1");
  }

}
