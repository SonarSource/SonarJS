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

import com.sonar.sslr.api.TokenType;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;

import static org.fest.assertions.Assertions.assertThat;

public class PrefixExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void unary_delete() throws Exception {
    test_unary_expression("delete a;", Kind.DELETE, EcmaScriptKeyword.DELETE);
  }

  @Test
  public void unary_void() throws Exception {
    test_unary_expression("void a;", Kind.VOID, EcmaScriptKeyword.VOID);
  }

  @Test
  public void unary_typeof() throws Exception {
    test_unary_expression("typeof a;", Kind.TYPEOF, EcmaScriptKeyword.TYPEOF);
  }

  @Test
  public void unary_increment() throws Exception {
    test_unary_expression("++a;", Kind.PREFIX_INCREMENT, EcmaScriptPunctuator.INC);
  }

  @Test
  public void unary_decrement() throws Exception {
    test_unary_expression("--a;", Kind.PREFIX_DECREMENT, EcmaScriptPunctuator.DEC);
  }

  @Test
  public void unary_plus() throws Exception {
    test_unary_expression("+a;", Kind.UNARY_PLUS, EcmaScriptPunctuator.PLUS);
  }

  @Test
  public void unary_minus() throws Exception {
    test_unary_expression("-a;", Kind.UNARY_MINUS, EcmaScriptPunctuator.MINUS);
  }

  @Test
  public void unary_bitwise_complement() throws Exception {
    test_unary_expression("~a;", Kind.BITWISE_COMPLEMENT, EcmaScriptPunctuator.TILDA);
  }

  @Test
  public void unary_logical_complement() throws Exception {
    test_unary_expression("!a;", Kind.LOGICAL_COMPLEMENT, EcmaScriptPunctuator.BANG);
  }

  private void test_unary_expression(String str, Kind kind, TokenType operator) throws Exception {
    UnaryExpressionTree tree = parse(str, kind);

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.operator().text()).isEqualTo(operator.getValue());
  }
}
