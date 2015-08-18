/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.tree.impl.statement;

import static org.fest.assertions.Assertions.assertThat;
import org.junit.Test;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;

public class IfStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_else() throws Exception {
    IfStatementTree tree = parse("if (a) {}", Kind.IF_STATEMENT);

    assertThat(tree.is(Kind.IF_STATEMENT)).isTrue();
    assertThat(tree.ifKeyword().text()).isEqualTo(JavaScriptKeyword.IF.getValue());
    assertThat(tree.openParenthesis().text()).isEqualTo(JavaScriptPunctuator.LPARENTHESIS.getValue());
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.closeParenthesis().text()).isEqualTo(JavaScriptPunctuator.RPARENTHESIS.getValue());
    assertThat(tree.statement().is(Kind.BLOCK)).isTrue();
  }

  @Test
  public void with_else() throws Exception {
    IfStatementTree tree = parse("if (a) {} else {}", Kind.IF_STATEMENT);

    assertThat(tree.is(Kind.IF_STATEMENT)).isTrue();
    assertThat(tree.ifKeyword().text()).isEqualTo(JavaScriptKeyword.IF.getValue());
    assertThat(tree.openParenthesis().text()).isEqualTo(JavaScriptPunctuator.LPARENTHESIS.getValue());
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.closeParenthesis().text()).isEqualTo(JavaScriptPunctuator.RPARENTHESIS.getValue());
    assertThat(tree.statement().is(Kind.BLOCK)).isTrue();

    assertThat(tree.elseClause().elseKeyword().text()).isEqualTo(JavaScriptKeyword.ELSE.getValue());
    assertThat(tree.elseClause().statement().is(Kind.BLOCK)).isTrue();
  }

  @Test
  public void hasElse() throws Exception {
    IfStatementTreeImpl tree = parse("if (a) {} else {}", Kind.IF_STATEMENT);

    assertThat(tree.hasElse()).isTrue();
  }

}
