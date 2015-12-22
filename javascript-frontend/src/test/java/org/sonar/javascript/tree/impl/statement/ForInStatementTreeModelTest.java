/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.tree.impl.statement;

import org.junit.Test;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;

import static org.fest.assertions.Assertions.assertThat;

public class ForInStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    ForInStatementTree tree = parse("for ( var a in expression ) { }", Kind.FOR_IN_STATEMENT);

    assertThat(tree.is(Kind.FOR_IN_STATEMENT)).isTrue();
    assertThat(tree.forKeyword().text()).isEqualTo(JavaScriptKeyword.FOR.getValue());
    assertThat(tree.openParenthesis().text()).isEqualTo(JavaScriptPunctuator.LPARENTHESIS.getValue());
    assertThat(tree.inKeyword().text()).isEqualTo(JavaScriptKeyword.IN.getValue());
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.closeParenthesis().text()).isEqualTo(JavaScriptPunctuator.RPARENTHESIS.getValue());
    assertThat(tree.statement().is(Kind.BLOCK)).isTrue();
  }

}
