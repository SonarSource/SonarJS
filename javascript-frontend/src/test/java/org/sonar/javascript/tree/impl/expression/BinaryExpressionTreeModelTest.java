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
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class BinaryExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void parent() throws Exception {
    BinaryExpressionTreeImpl tree = parse("a + b", Kind.PLUS);
    assertThat(tree.parent().is(Kind.EXPRESSION_STATEMENT)).isTrue();
  }

  @Test
  public void conditional_or() throws Exception {
    test_binary_expression("a || b || c;", Kind.CONDITIONAL_OR, "||");
  }

  @Test
  public void conditional_and() throws Exception {
    test_binary_expression("a && b && c;", Kind.CONDITIONAL_AND, "&&");
  }

  @Test
  public void bitwise_or() throws Exception {
    test_binary_expression("a | b | c;", Kind.BITWISE_OR, "|");
  }

  @Test
  public void bitwise_and() throws Exception {
    test_binary_expression("a & b & c;", Kind.BITWISE_AND, "&");
  }

  @Test
  public void bitwise_xor() throws Exception {
    test_binary_expression("a ^ b ^ c;", Kind.BITWISE_XOR, "^");
  }

  @Test
  public void equality_equal_to() throws Exception {
    test_binary_expression("a == b == c;", Kind.EQUAL_TO, "==");
  }

  @Test
  public void equality_not_equal_to() throws Exception {
    test_binary_expression("a != b != c;", Kind.NOT_EQUAL_TO, "!=");
  }

  @Test
  public void equality_strict_equal_to() throws Exception {
    test_binary_expression("a === b === c;", Kind.STRICT_EQUAL_TO, "===");
  }

  @Test
  public void equality_strict_not_equal_to() throws Exception {
    test_binary_expression("a !== b !== c;", Kind.STRICT_NOT_EQUAL_TO, "!==");
  }

  @Test
  public void relation_less_than() throws Exception {
    test_binary_expression("a < b < c;", Kind.LESS_THAN, "<");
  }

  @Test
  public void relation_greater_than() throws Exception {
    test_binary_expression("a > b > c;", Kind.GREATER_THAN, ">");
  }

  @Test
  public void relation_less_or_equal_to() throws Exception {
    test_binary_expression("a <= b <= c;", Kind.LESS_THAN_OR_EQUAL_TO, "<=");
  }

  @Test
  public void relation_greater_or_equal_to() throws Exception {
    test_binary_expression("a >= b >= c;", Kind.GREATER_THAN_OR_EQUAL_TO, ">=");
  }

  @Test
  public void relation_instance_of() throws Exception {
    test_binary_expression("a instanceof b instanceof c;", Kind.INSTANCE_OF, "instanceof");
  }

  @Test
  public void relation_in() throws Exception {
    test_binary_expression("a in b in c;", Kind.RELATIONAL_IN, "in");
  }

  @Test
  public void shift_left() throws Exception {
    test_binary_expression("a << b << c;", Kind.LEFT_SHIFT, "<<");
  }

  @Test
  public void shift_right() throws Exception {
    test_binary_expression("a >> b >> c;", Kind.RIGHT_SHIFT, ">>");
  }

  @Test
  public void shift_unsigned_right() throws Exception {
    test_binary_expression("a >>> b >>> c;", Kind.UNSIGNED_RIGHT_SHIFT, ">>>");
  }

  @Test
  public void additive_plus() throws Exception {
    test_binary_expression("a + b + c;", Kind.PLUS, "+");
  }

  @Test
  public void additive_minus() throws Exception {
    test_binary_expression("a - b - c;", Kind.MINUS, "-");
  }

  @Test
  public void multiplicative_multiply() throws Exception {
    test_binary_expression("a * b * c;", Kind.MULTIPLY, "*");
  }

  @Test
  public void exponentiation_expression() throws Exception {
    String str = "a ** b ** c;";
    Kind exponentKind = Kind.EXPONENT;
    String operator = "**";

    BinaryExpressionTree tree = parse(str, exponentKind);

    assertThat(tree.is(exponentKind)).isTrue();
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operatorToken().text()).isEqualTo(operator);
    assertThat(tree.rightOperand()).isNotNull();

    tree = (BinaryExpressionTree) tree.rightOperand();

    assertThat(tree.is(exponentKind)).isTrue();
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operatorToken().text()).isEqualTo(operator);
    assertThat(tree.rightOperand()).isNotNull();
  }

  @Test
  public void multiplicative_divide() throws Exception {
    test_binary_expression("a / b / c;", Kind.DIVIDE, "/");
  }

  @Test
  public void multiplicative_remainder() throws Exception {
    test_binary_expression("a % b % c;", Kind.REMAINDER, "%");
  }

  @Test
  public void comma() throws Exception {
    test_binary_expression("a, b, c", Kind.COMMA_OPERATOR, ",");
  }

  private void test_binary_expression(String str, Kind kind, String operator) throws Exception {
    BinaryExpressionTree tree = parse(str, kind);

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operatorToken().text()).isEqualTo(operator);
    assertThat(tree.rightOperand()).isNotNull();

    tree = (BinaryExpressionTree) tree.leftOperand();

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.leftOperand()).isNotNull();
    assertThat(tree.operatorToken().text()).isEqualTo(operator);
    assertThat(tree.rightOperand()).isNotNull();
  }
}
