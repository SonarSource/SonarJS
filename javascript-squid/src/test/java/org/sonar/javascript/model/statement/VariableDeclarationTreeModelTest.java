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
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.statement.VariableDeclarationTree;

import static org.fest.assertions.Assertions.assertThat;

import java.util.List;

public class VariableDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void single_declaration() throws Exception {
    VariableDeclarationTree tree = parse("var varDeclaration ;", Kind.VAR_DECLARATION);

    assertThat(tree.is(Kind.VAR_DECLARATION)).isTrue();
    assertThat(tree.token().text()).isEqualTo("var");
    assertThat(tree.variables()).hasSize(1);
    assertThat(tree.variables().getSeparators()).isEmpty();
  }

  @Test
  public void multiple_declarations() throws Exception {
    VariableDeclarationTree tree = parse("let varDeclaration , varDeclaration , varDeclaration ;", Kind.LET_DECLARATION);

    assertThat(tree.is(Kind.LET_DECLARATION)).isTrue();
    assertThat(tree.token().text()).isEqualTo("let");
    assertThat(tree.variables()).hasSize(3);
    assertThat(tree.variables().getSeparators()).hasSize(2);
  }

  @Test
  public void bindingIdentifiers() throws Exception {
    VariableDeclarationTreeImpl tree = parse("let a , b = 1 , { x : c } = obj;", Kind.LET_DECLARATION);

    List<IdentifierTree> bindingName = tree.variableIdentifiers();
    assertThat(bindingName).hasSize(3);
    assertThat(bindingName.get(0).name()).isEqualTo("a");
    assertThat(bindingName.get(1).name()).isEqualTo("b");
    assertThat(bindingName.get(2).name()).isEqualTo("c");
  }

}
