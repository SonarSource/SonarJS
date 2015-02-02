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

import static org.fest.assertions.Assertions.assertThat;
import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.BlockTree;

public class BlockTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_statements() throws Exception {
   BlockTree tree = parse("{ }", Kind.BLOCK);

    assertThat(tree.is(Kind.BLOCK)).isTrue();
    assertThat(tree.openCurlyBrace().text()).isEqualTo("{");
    assertThat(tree.statements()).hasSize(0);
    assertThat(tree.closeCurlyBrace().text()).isEqualTo("}");
  }

  @Test
  public void with_statements() throws Exception {
    BlockTree tree = parse("{ expr ; var a ; }", Kind.BLOCK);

    assertThat(tree.is(Kind.BLOCK)).isTrue();
    assertThat(tree.openCurlyBrace().text()).isEqualTo("{");

    assertThat(tree.statements()).hasSize(2);
    assertThat(expressionToString(tree.statements().get(0))).isEqualTo("expr ;");
    assertThat(expressionToString(tree.statements().get(1))).isEqualTo("var a ;");

    assertThat(tree.closeCurlyBrace().text()).isEqualTo("}");
  }

}
