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
package org.sonar.javascript.model.declaration;

import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.VariableStatementTree;

import static org.fest.assertions.Assertions.assertThat;

public class LexicalDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void let_decl() throws Exception {
    VariableStatementTree tree = parse("let a, b, [,,] = foo;", Kind.LET_DECLARATION);

    assertThat(tree.is(Kind.LET_DECLARATION)).isTrue();
    assertThat(tree.token().text()).isEqualTo("let");
    assertThat(tree.variables()).hasSize(3);
    assertThat(tree.variables().getSeparators()).hasSize(2);
  }

  @Test
  public void const_decl() throws Exception {
    VariableStatementTree tree = parse("const a, b, [,,] = foo;", Kind.CONST_DECLARATION);

    assertThat(tree.is(Kind.CONST_DECLARATION)).isTrue();
    assertThat(tree.token().text()).isEqualTo("const");
    assertThat(tree.variables()).hasSize(3);
    assertThat(tree.variables().getSeparators()).hasSize(2);
  }

}
