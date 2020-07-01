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
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;

import static org.assertj.core.api.Assertions.assertThat;

public class MemberExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void dot_member_expression() throws Exception {
    DotMemberExpressionTree tree = parse("a.b.c;", Kind.DOT_MEMBER_EXPRESSION);

    assertThat(tree.is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.object().is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.dotToken().text()).isEqualTo(JavaScriptPunctuator.DOT.getValue());
    assertThat(tree.property().is(Kind.PROPERTY_IDENTIFIER)).isTrue();

    tree = (DotMemberExpressionTree) tree.object();

    assertThat(tree.is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.object().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
    assertThat(tree.dotToken().text()).isEqualTo(JavaScriptPunctuator.DOT.getValue());
    assertThat(tree.property().is(Kind.PROPERTY_IDENTIFIER)).isTrue();

  }

  @Test
  public void bracket_member_expression() throws Exception {
    BracketMemberExpressionTreeImpl tree = parse("a[0][0]", Kind.BRACKET_MEMBER_EXPRESSION);

    assertThat(tree.is(Kind.BRACKET_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.openBracketToken().text()).isEqualTo(JavaScriptPunctuator.LBRACKET.getValue());
    assertThat(tree.property()).isNotNull();
    assertThat(tree.closeBracketToken().text()).isEqualTo(JavaScriptPunctuator.RBRACKET.getValue());
  }

}
