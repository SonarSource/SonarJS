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
package org.sonar.javascript.model.statement;

import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;

import static org.fest.assertions.Assertions.assertThat;

public class ForStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
   ForStatementTree tree = parse("for ( ; ; ) { }", Kind.FOR_STATEMENT);

    assertThat(tree.is(Kind.FOR_STATEMENT)).isTrue();
    assertThat(tree.forKeyword().text()).isEqualTo(EcmaScriptKeyword.FOR.getValue());
    assertThat(tree.openParenthesis().text()).isEqualTo(EcmaScriptPunctuator.LPARENTHESIS.getValue());
    assertThat(tree.firstSemicolon().text()).isEqualTo(EcmaScriptPunctuator.SEMI.getValue());
    assertThat(tree.condition()).isNull();
    assertThat(tree.secondSemicolon().text()).isEqualTo(EcmaScriptPunctuator.SEMI.getValue());
    assertThat(tree.condition()).isNull();
    assertThat(tree.closeParenthesis().text()).isEqualTo(EcmaScriptPunctuator.RPARENTHESIS.getValue());
    assertThat(tree.statement().is(Kind.BLOCK)).isTrue();
  }

  @Test
  public void init() throws Exception {
    ForStatementTree tree = parse("for ( var i = 0 ; ; ) { }", Kind.FOR_STATEMENT);
    assertThat(tree.init()).isNotNull();
  }

  @Test
  public void condition() throws Exception {
    ForStatementTree tree = parse("for ( ; i < 42; ) { }", Kind.FOR_STATEMENT);
    assertThat(tree.condition()).isNotNull();
  }

  @Test
  public void update() throws Exception {
    ForStatementTree tree = parse("for ( ; ; i++ ) { }", Kind.FOR_STATEMENT);
    assertThat(tree.update()).isNotNull();
  }

}
