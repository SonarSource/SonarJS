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
package org.sonar.javascript.tree.impl.declaration;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.assertj.core.api.Assertions.assertThat;

public class MethodDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void method() throws Exception {
    MethodDeclarationTree tree = parse("var a = { @decorator method() {} }", Kind.METHOD);

    assertThat(tree.is(Kind.METHOD)).isTrue();
    assertThat(tree.decorators()).hasSize(1);
    assertThat(tree.staticToken()).isNull();
    assertThat(((IdentifierTree) tree.name()).name()).isEqualTo("method");
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.returnType()).isNull();
    assertThat(tree.body()).isNotNull();
  }


  @Test
  public void static_method() throws Exception {
    MethodDeclarationTree tree = parse("var a = { static method() {} }", Kind.METHOD);

    assertThat(tree.is(Kind.METHOD)).isTrue();
    assertThat(tree.staticToken()).isNotNull();
    assertThat(((IdentifierTree) tree.name()).name()).isEqualTo("method");
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.body()).isNotNull();
  }


  @Test
  public void async() throws Exception {
    MethodDeclarationTree tree = parse("var a = { async method() {} }", Kind.METHOD);
    assertThat(tree.asyncToken().text()).isEqualTo("async");

    tree = parse("var a = { method() {} }", Kind.METHOD);
    assertThat(tree.asyncToken()).isNull();
  }

  @Test
  public void generator_method() throws Exception {
    MethodDeclarationTree tree = parse("var a = { @decorator * method () {} }", Kind.GENERATOR_METHOD);

    assertThat(tree.is(Kind.GENERATOR_METHOD)).isTrue();
    assertThat(tree.decorators()).hasSize(1);
    assertThat(tree.staticToken()).isNull();
    assertThat(tree.asyncToken()).isNull();
    assertThat(tree.starToken().text()).isEqualTo("*");
    assertThat(((IdentifierTree) tree.name()).name()).isEqualTo("method");
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.body()).isNotNull();
  }


  @Test
  public void static_generator_method() throws Exception {
    MethodDeclarationTree tree = parse("var a = { static * method () {} }", Kind.GENERATOR_METHOD);

    assertThat(tree.is(Kind.GENERATOR_METHOD)).isTrue();
    assertThat(tree.staticToken()).isNotNull();
    assertThat(tree.starToken().text()).isEqualTo("*");
    assertThat(((IdentifierTree) tree.name()).name()).isEqualTo("method");
    assertThat(tree.parameterClause()).isNotNull();
    assertThat(tree.body()).isNotNull();
  }

  @Test
  public void flow_typed() throws Exception {
    MethodDeclarationTree tree = parse("var a = {  method<T>(): void {} }", Kind.METHOD);
    assertThat(tree.genericParameterClause()).isNotNull();
    assertThat(tree.returnType()).isNotNull();
  }
}
