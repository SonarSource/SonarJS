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

public class SwitchClauseTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void case_clause() throws Exception {
    CaseClauseTreeImpl tree = parse("switch (a) { case 1: }", Kind.CASE_CLAUSE);

    assertThat(tree.is(Kind.CASE_CLAUSE)).isTrue();
    assertThat(tree.keyword().text()).isEqualTo("case");
    assertThat(expressionToString(tree.expression())).isEqualTo("1");
    assertThat(tree.colonToken().text()).isEqualTo(":");
  }

  @Test
  public void default_clause() throws Exception {
    DefaultClauseTreeImpl tree = parse("switch (a) { default: }", Kind.DEFAULT_CLAUSE);

    assertThat(tree.is(Kind.DEFAULT_CLAUSE)).isTrue();
    assertThat(tree.keyword().text()).isEqualTo("default");
    assertThat(tree.colonToken().text()).isEqualTo(":");
  }

}
