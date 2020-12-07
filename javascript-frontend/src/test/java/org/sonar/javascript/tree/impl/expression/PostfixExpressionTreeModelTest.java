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
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class PostfixExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void unary_increment() throws Exception {
    test_unary_expression("a++;", Kind.POSTFIX_INCREMENT, JavaScriptPunctuator.INC);
  }

  @Test
  public void unary_decrement() throws Exception {
    test_unary_expression("a--;", Kind.POSTFIX_DECREMENT, JavaScriptPunctuator.DEC);
  }

  private void test_unary_expression(String str, Kind kind, TokenType operator) throws Exception {
    UnaryExpressionTree tree = parse(str, kind);

    assertThat(tree.is(kind)).isTrue();
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.operatorToken().text()).isEqualTo(operator.getValue());
  }
}
