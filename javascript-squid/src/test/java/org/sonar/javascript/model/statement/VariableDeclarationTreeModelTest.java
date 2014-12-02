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

import com.sonar.sslr.api.AstNode;
import static org.fest.assertions.Assertions.assertThat;
import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.VariableDeclarationTree;
import org.sonar.javascript.model.interfaces.statement.VariableStatementTree;

import java.util.List;

public class VariableDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void single_declaration() throws Exception {
    VariableDeclarationTreeImpl tree = parse("var varDeclaration ;", Kind.VARIABLE_DECLARATION);

    assertThat(tree.is(Kind.VARIABLE_DECLARATION)).isTrue();
  }

  @Test
  public void multiple_declarations() throws Exception {
    List<AstNode> nodes = parse("var varDeclaration , varDeclaration , varDeclaration ;").getDescendants(Kind.VARIABLE_DECLARATION);

    assertThat(nodes.size()).isEqualTo(3);
    assertThat(((VariableDeclarationTree) nodes.get(0)).is(Kind.VARIABLE_DECLARATION)).isTrue();
  }

}
