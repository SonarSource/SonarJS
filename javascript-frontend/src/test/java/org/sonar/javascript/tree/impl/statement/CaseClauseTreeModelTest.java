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
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;

import static org.assertj.core.api.Assertions.assertThat;

public class CaseClauseTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_statements() throws Exception {
    CaseClauseTree tree = parse("switch (a) { case 1 : }", Kind.CASE_CLAUSE);

    assertThat(tree.is(Kind.CASE_CLAUSE)).isTrue();
    assertThat(tree.keyword().text()).isEqualTo("case");
    assertThat(expressionToString(tree.expression())).isEqualTo("1");
    assertThat(tree.colonToken().text()).isEqualTo(":");


    assertThat(tree.statements()).hasSize(0);
  }

  @Test
  public void with_statements() throws Exception {
    CaseClauseTree tree = parse("switch (a) { case 1 : expr ; return ; }", Kind.CASE_CLAUSE);

    assertThat(tree.is(Kind.CASE_CLAUSE)).isTrue();
    assertThat(tree.keyword().text()).isEqualTo("case");
    assertThat(expressionToString(tree.expression())).isEqualTo("1");
    assertThat(tree.colonToken().text()).isEqualTo(":");

    assertThat(tree.statements()).hasSize(2);
    assertThat(expressionToString(tree.statements().get(0))).isEqualTo("expr ;");
    assertThat(expressionToString(tree.statements().get(1))).isEqualTo("return ;");
  }

}
