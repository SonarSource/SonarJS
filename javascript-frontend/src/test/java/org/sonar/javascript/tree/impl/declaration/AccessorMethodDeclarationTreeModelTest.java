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
package org.sonar.javascript.tree.impl.declaration;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.assertj.core.api.Assertions.assertThat;

public class AccessorMethodDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void get_method() throws Exception {
    AccessorMethodDeclarationTree tree = parse("var a = { @decorator get method() {} }", Kind.GET_METHOD);

    assertThat(tree.is(Kind.GET_METHOD)).isTrue();
    assertThat(tree.decorators()).hasSize(1);
    assertThat(tree.staticToken()).isNull();
    assertThat(tree.asyncToken()).isNull();
    assertThat(tree.accessorToken().text()).isEqualTo("get");
    assertThat(((IdentifierTree) tree.name()).name()).isEqualTo("method");
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.returnType()).isNull();
    assertThat(tree.body()).isNotNull();
  }


  @Test
  public void set_method() throws Exception {
    AccessorMethodDeclarationTree tree = parse("var a = { set method() {} }", Kind.SET_METHOD);

    assertThat(tree.is(Kind.SET_METHOD)).isTrue();
    assertThat(tree.staticToken()).isNull();
    assertThat(tree.asyncToken()).isNull();
    assertThat(tree.accessorToken().text()).isEqualTo("set");
    assertThat(((IdentifierTree) tree.name()).name()).isEqualTo("method");
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.body()).isNotNull();
  }

  @Test
  public void static_set_method() throws Exception {
    AccessorMethodDeclarationTree tree = parse("var a = { static set method() {} }", Kind.SET_METHOD);

    assertThat(tree.is(Kind.SET_METHOD)).isTrue();
    assertThat(tree.staticToken()).isNotNull();
    assertThat(tree.asyncToken()).isNull();
    assertThat(tree.accessorToken().text()).isEqualTo("set");
    assertThat(((IdentifierTree) tree.name()).name()).isEqualTo("method");
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.body()).isNotNull();
  }

  @Test
  public void flow_typed() throws Exception {
    AccessorMethodDeclarationTree tree = parse("var a = { get foo<T>(): number {} }", Kind.GET_METHOD);
    assertThat(tree.genericParameterClause()).isNotNull();
    assertThat(tree.returnType()).isNotNull();
  }
}
