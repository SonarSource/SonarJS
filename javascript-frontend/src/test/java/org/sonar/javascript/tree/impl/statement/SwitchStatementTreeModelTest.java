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
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.assertj.core.api.Assertions.assertThat;

public class SwitchStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_case() throws Exception {
    SwitchStatementTreeImpl tree = parse("switch (a) { }", Kind.SWITCH_STATEMENT);

    assertThat(tree.is(Kind.SWITCH_STATEMENT)).isTrue();
    assertThat(tree.switchKeyword().text()).isEqualTo("switch");
    assertThat(tree.openParenthesisToken().text()).isEqualTo("(");
    assertThat(expressionToString(tree.expression())).isEqualTo("a");
    assertThat(tree.closeParenthesisToken().text()).isEqualTo(")");

    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");
    assertThat(tree.cases()).hasSize(0);
    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void with_cases() throws Exception {
    SwitchStatementTreeImpl tree = parse("switch (a) { case 1 : case 2 : }", Kind.SWITCH_STATEMENT);

    assertThat(tree.is(Kind.SWITCH_STATEMENT)).isTrue();
    assertThat(tree.switchKeyword().text()).isEqualTo("switch");
    assertThat(tree.openParenthesisToken().text()).isEqualTo("(");
    assertThat(expressionToString(tree.expression())).isEqualTo("a");
    assertThat(tree.closeParenthesisToken().text()).isEqualTo(")");

    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");

    assertThat(tree.cases()).hasSize(2);
    assertThat(expressionToString(tree.cases().get(0))).isEqualTo("case 1 :");
    assertThat(expressionToString(tree.cases().get(1))).isEqualTo("case 2 :");

    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

}
