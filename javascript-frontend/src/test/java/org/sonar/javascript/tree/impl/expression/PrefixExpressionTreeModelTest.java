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

import com.sonar.sslr.api.TokenType;
import org.junit.Test;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class PrefixExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void unary_delete() throws Exception {
    test_unary_expression("delete a;", Kind.DELETE, JavaScriptKeyword.DELETE);
  }

  @Test
  public void unary_void() throws Exception {
    test_unary_expression("void a;", Kind.VOID, JavaScriptKeyword.VOID);
  }

  @Test
  public void unary_typeof() throws Exception {
    test_unary_expression("typeof a;", Kind.TYPEOF, JavaScriptKeyword.TYPEOF);
  }

  @Test
  public void unary_increment() throws Exception {
    test_unary_expression("++a;", Kind.PREFIX_INCREMENT, JavaScriptPunctuator.INC);
  }

  @Test
  public void unary_decrement() throws Exception {
    test_unary_expression("--a;", Kind.PREFIX_DECREMENT, JavaScriptPunctuator.DEC);
  }

  @Test
  public void unary_plus() throws Exception {
    test_unary_expression("+a;", Kind.UNARY_PLUS, JavaScriptPunctuator.PLUS);
  }

  @Test
  public void unary_minus() throws Exception {
    test_unary_expression("-a;", Kind.UNARY_MINUS, JavaScriptPunctuator.MINUS);
  }

  @Test
  public void unary_bitwise_complement() throws Exception {
    test_unary_expression("~a;", Kind.BITWISE_COMPLEMENT, JavaScriptPunctuator.TILDA);
  }

  @Test
  public void unary_logical_complement() throws Exception {
    test_unary_expression("!a;", Kind.LOGICAL_COMPLEMENT, JavaScriptPunctuator.BANG);
  }

  private void test_unary_expression(String str, Kind kind, TokenType operator) throws Exception {
    UnaryExpressionTree tree = parse(str, kind);

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.operatorToken().text()).isEqualTo(operator.getValue());
  }
}
