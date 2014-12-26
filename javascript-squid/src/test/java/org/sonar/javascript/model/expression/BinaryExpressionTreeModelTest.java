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
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;

public class BinaryExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void conditional_or() throws Exception {
    test_binary_expression("a || b || c;", Kind.CONDITIONAL_OR, EcmaScriptPunctuator.OROR);
  }

  @Test
  public void conditional_and() throws Exception {
    test_binary_expression("a && b && c;", Kind.CONDITIONAL_AND, EcmaScriptPunctuator.ANDAND);
  }

  @Test
  public void bitwise_or() throws Exception {
    test_binary_expression("a | b | c;", Kind.BITWISE_OR, EcmaScriptPunctuator.OR);
  }

  @Test
  public void bitwise_and() throws Exception {
    test_binary_expression("a & b & c;", Kind.BITWISE_AND, EcmaScriptPunctuator.AND);
  }

  @Test
  public void bitwise_xor() throws Exception {
    test_binary_expression("a ^ b ^ c;", Kind.BITWISE_XOR, EcmaScriptPunctuator.XOR);
  }

  private void test_binary_expression(String str, Kind kind, EcmaScriptPunctuator operator) throws Exception {
    BinaryExpressionTree tree = parse(str, kind);

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator().text()).isEqualTo(operator.getValue());
    assertThat(tree.rightOperand()).isNotNull();

    tree = (BinaryExpressionTree) tree.leftOperand();

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operator().text()).isEqualTo(operator.getValue());
    assertThat(tree.rightOperand()).isNotNull();
  }
}
