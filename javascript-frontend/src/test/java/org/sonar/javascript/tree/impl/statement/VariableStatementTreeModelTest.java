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
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ObjectBindingPatternTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;

import static org.assertj.core.api.Assertions.assertThat;

public class VariableStatementTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void single_declaration() throws Exception {
    VariableStatementTree tree = parse("var varDeclaration ;", Kind.VARIABLE_STATEMENT);

    assertThat(tree.is(Kind.VARIABLE_STATEMENT)).isTrue();
    assertThat(tree.declaration().variables()).hasSize(1);
  }

  @Test
  public void multiple_declarations() throws Exception {
    VariableStatementTree tree = parse("var varDeclaration , varDeclaration , varDeclaration ;", Kind.VARIABLE_STATEMENT);

    assertThat(tree.is(Kind.VARIABLE_STATEMENT)).isTrue();
    assertThat(tree.declaration().variables()).hasSize(3);
  }

  @Test
  public void trailing_comma() throws Exception {
    VariableStatementTree tree = parse("const {...rest,} = obj;", Kind.VARIABLE_STATEMENT);
    assertThat(tree.is(Kind.VARIABLE_STATEMENT)).isTrue();
    InitializedBindingElementTree bindingElementTree = (InitializedBindingElementTree) tree.declaration().variables().get(0);
    ObjectBindingPatternTree objectBinding = (ObjectBindingPatternTree) bindingElementTree.left();
    assertThat(objectBinding.elements()).hasSize(1);
    assertThat(objectBinding.elements().getSeparators()).hasSize(1);
  }

}
