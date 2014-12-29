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

import com.sonar.sslr.api.TokenType;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptKeyword;
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

  @Test
  public void equality_equal_to() throws Exception {
    test_binary_expression("a == b == c;", Kind.EQUAL_TO, EcmaScriptPunctuator.EQUAL);
  }

  @Test
  public void equality_not_equal_to() throws Exception {
    test_binary_expression("a != b != c;", Kind.NOT_EQUAL_TO, EcmaScriptPunctuator.NOTEQUAL);
  }

  @Test
  public void equality_strict_equal_to() throws Exception {
    test_binary_expression("a === b === c;", Kind.STRICT_EQUAL_TO, EcmaScriptPunctuator.EQUAL2);
  }

  @Test
  public void equality_strict_not_equal_to() throws Exception {
    test_binary_expression("a !== b !== c;", Kind.STRICT_NOT_EQUAL_TO, EcmaScriptPunctuator.NOTEQUAL2);
  }

  @Test
  public void relation_less_than() throws Exception {
    test_binary_expression("a < b < c;", Kind.LESS_THAN, EcmaScriptPunctuator.LT);
  }

  @Test
  public void relation_greater_than() throws Exception {
    test_binary_expression("a > b > c;", Kind.GREATER_THAN, EcmaScriptPunctuator.GT);
  }

  @Test
  public void relation_less_or_equal_to() throws Exception {
    test_binary_expression("a <= b <= c;", Kind.LESS_THAN_OR_EQUAL_TO, EcmaScriptPunctuator.LE);
  }

  @Test
  public void relation_greater_or_equal_to() throws Exception {
    test_binary_expression("a >= b >= c;", Kind.GREATER_THAN_OR_EQUAL_TO, EcmaScriptPunctuator.GE);
  }

  @Test
  public void relation_instance_of() throws Exception {
    test_binary_expression("a instanceof b instanceof c;", Kind.INSTANCE_OF, EcmaScriptKeyword.INSTANCEOF);
  }

  @Test
  public void relation_in() throws Exception {
    test_binary_expression("a in b in c;", Kind.RELATIONAL_IN, EcmaScriptKeyword.IN);
  }

  @Test
  public void shift_left() throws Exception {
    test_binary_expression("a << b << c;", Kind.LEFT_SHIFT, EcmaScriptPunctuator.SL);
  }

  @Test
  public void shift_right() throws Exception {
    test_binary_expression("a >> b >> c;", Kind.RIGHT_SHIFT, EcmaScriptPunctuator.SR);
  }

  @Test
  public void shift_unsigned_right() throws Exception {
    test_binary_expression("a >>> b >>> c;", Kind.UNSIGNED_RIGHT_SHIFT, EcmaScriptPunctuator.SR2);
  }

  @Test
  public void additive_plus() throws Exception {
    test_binary_expression("a + b + c;", Kind.PLUS, EcmaScriptPunctuator.PLUS);
  }

  @Test
  public void additive_minus() throws Exception {
    test_binary_expression("a - b - c;", Kind.MINUS, EcmaScriptPunctuator.MINUS);
  }

  @Test
  public void multiplicative_multiply() throws Exception {
    test_binary_expression("a * b * c;", Kind.MULTIPLY, EcmaScriptPunctuator.STAR);
  }

  @Test
  public void multiplicative_divide() throws Exception {
    test_binary_expression("a / b / c;", Kind.DIVIDE, EcmaScriptPunctuator.DIV);
  }

  @Test
  public void multiplicative_remainder() throws Exception {
    test_binary_expression("a % b % c;", Kind.REMAINDER, EcmaScriptPunctuator.MOD);
  }

  private void test_binary_expression(String str, Kind kind, TokenType operator) throws Exception {
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
