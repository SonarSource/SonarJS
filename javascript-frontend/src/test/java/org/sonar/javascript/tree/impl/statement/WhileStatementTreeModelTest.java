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
package org.sonar.javascript.tree.impl.statement;

import org.junit.Test;
import org.sonar.javascript.lexer.JavaScriptKeyword;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class WhileStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    WhileStatementTree tree = parse("while ( a ) { }", Kind.WHILE_STATEMENT);

    assertThat(tree.is(Kind.WHILE_STATEMENT)).isTrue();
    assertThat(tree.whileKeyword().text()).isEqualTo(JavaScriptKeyword.WHILE.getValue());
    assertThat(tree.openParenthesisToken().text()).isEqualTo(JavaScriptPunctuator.LPARENTHESIS.getValue());
    assertThat(tree.condition()).isNotNull();
    assertThat(tree.closeParenthesisToken().text()).isEqualTo(JavaScriptPunctuator.RPARENTHESIS.getValue());
    assertThat(tree.statement().is(Kind.BLOCK)).isTrue();
  }

}
