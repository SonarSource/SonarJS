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
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.implementations.statement.SwitchStatementTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;

import static org.fest.assertions.Assertions.assertThat;

public class SwitchStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_case() throws Exception {
   SwitchStatementTreeImpl tree = parse("switch (a) { }", Kind.SWITCH_STATEMENT);

    assertThat(tree.is(Kind.SWITCH_STATEMENT)).isTrue();
    assertThat(tree.switchKeyword().text()).isEqualTo("switch");
    assertThat(tree.openParenthesis().text()).isEqualTo("(");
    assertThat(expressionToString(tree.expression())).isEqualTo("a");
    assertThat(tree.closeParenthesis().text()).isEqualTo(")");

    assertThat(tree.openCurlyBrace().text()).isEqualTo("{");
    assertThat(tree.cases()).hasSize(0);
    assertThat(tree.closeCurlyBrace().text()).isEqualTo("}");
  }

  @Test
  public void with_cases() throws Exception {
    SwitchStatementTreeImpl tree = parse("switch (a) { case 1 : case 2 : }", Kind.SWITCH_STATEMENT);

    assertThat(tree.is(Kind.SWITCH_STATEMENT)).isTrue();
    assertThat(tree.switchKeyword().text()).isEqualTo("switch");
    assertThat(tree.openParenthesis().text()).isEqualTo("(");
    assertThat(expressionToString(tree.expression())).isEqualTo("a");
    assertThat(tree.closeParenthesis().text()).isEqualTo(")");

    assertThat(tree.openCurlyBrace().text()).isEqualTo("{");

    assertThat(tree.cases()).hasSize(2);
    assertThat(expressionToString(tree.cases().get(0))).isEqualTo("case 1 :");
    assertThat(expressionToString(tree.cases().get(1))).isEqualTo("case 2 :");

    assertThat(tree.closeCurlyBrace().text()).isEqualTo("}");
  }

}
