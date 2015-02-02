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
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;

import static org.fest.assertions.Assertions.assertThat;

public class PostfixExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void unary_increment() throws Exception {
    test_unary_expression("a++;", Kind.POSTFIX_INCREMENT, EcmaScriptPunctuator.INC);
  }

  @Test
  public void unary_decrement() throws Exception {
    test_unary_expression("a--;", Kind.POSTFIX_DECREMENT, EcmaScriptPunctuator.DEC);
  }

  private void test_unary_expression(String str, Kind kind, TokenType operator) throws Exception {
    UnaryExpressionTree tree = parse(str, kind);

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.operator().text()).isEqualTo(operator.getValue());
  }
}
