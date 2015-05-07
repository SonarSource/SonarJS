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

import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.internal.expression.BracketMemberExpressionTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;

import static org.fest.assertions.Assertions.assertThat;

public class MemberExpressionTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void dot_member_expression() throws Exception {
    DotMemberExpressionTree tree = parse("a.b.c;", Kind.DOT_MEMBER_EXPRESSION);

    assertThat(tree.is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.object().is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.dot().text()).isEqualTo(EcmaScriptPunctuator.DOT.getValue());
    assertThat(tree.property().is(Kind.IDENTIFIER_NAME)).isTrue();

    tree = (DotMemberExpressionTree) tree.object();

    assertThat(tree.is(Kind.DOT_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.object().is(Kind.IDENTIFIER_REFERENCE)).isTrue();
    assertThat(tree.dot().text()).isEqualTo(EcmaScriptPunctuator.DOT.getValue());
    assertThat(tree.property().is(Kind.IDENTIFIER_NAME)).isTrue();

  }

  @Test
  public void bracket_member_expression() throws Exception {
    BracketMemberExpressionTreeImpl tree = parse("a[0][0]", Kind.BRACKET_MEMBER_EXPRESSION);

    assertThat(tree.is(Kind.BRACKET_MEMBER_EXPRESSION)).isTrue();
    assertThat(tree.openBracket().text()).isEqualTo(EcmaScriptPunctuator.LBRACKET.getValue());
    assertThat(tree.property()).isNotNull();
    assertThat(tree.closeBracket().text()).isEqualTo(EcmaScriptPunctuator.RBRACKET.getValue());
  }

}
