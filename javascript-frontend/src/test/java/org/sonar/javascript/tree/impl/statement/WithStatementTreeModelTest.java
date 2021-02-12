/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import org.sonar.plugins.javascript.api.tree.statement.WithStatementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class WithStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void test() throws Exception {
    WithStatementTree tree = parse("with ( expr ) statement ;", Kind.WITH_STATEMENT);

    assertThat(tree.is(Kind.WITH_STATEMENT)).isTrue();
    assertThat(tree.withKeyword().text()).isEqualTo(JavaScriptKeyword.WITH.getValue());
    assertThat(tree.openingParenthesisToken().text()).isEqualTo(JavaScriptPunctuator.LPARENTHESIS.getValue());
    assertThat(tree.expression()).isNotNull();
    assertThat(tree.closingParenthesisToken().text()).isEqualTo(JavaScriptPunctuator.RPARENTHESIS.getValue());
    assertThat(tree.statement().is(Kind.EXPRESSION_STATEMENT)).isTrue();
  }

}
