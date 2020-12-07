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
import org.sonar.plugins.javascript.api.tree.declaration.FieldDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.assertj.core.api.Assertions.assertThat;

public class ClassDeclarationTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void without_members() throws Exception {
    ClassTree tree = parse("@decorator class C { }", Kind.CLASS_DECLARATION);

    assertThat(tree.is(Kind.CLASS_DECLARATION)).isTrue();
    assertThat(tree.decorators()).hasSize(1);
    assertThat(tree.classToken().text()).isEqualTo("class");
    assertThat(tree.name().name()).isEqualTo("C");
    assertThat(tree.extendsClause()).isNull();
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");
    assertThat(tree.elements()).isEmpty();
    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void with_members() throws Exception {
    ClassTree tree = parse("class C { m() {} static m(){} ; }", Kind.CLASS_DECLARATION);

    assertThat(tree.is(Kind.CLASS_DECLARATION)).isTrue();
    assertThat(tree.classToken().text()).isEqualTo("class");
    assertThat(tree.name().name()).isEqualTo("C");
    assertThat(tree.extendsClause()).isNull();
    assertThat(tree.openCurlyBraceToken().text()).isEqualTo("{");
    assertThat(tree.elements()).hasSize(3);
    assertThat(tree.closeCurlyBraceToken().text()).isEqualTo("}");
  }

  @Test
  public void extends_clause() throws Exception {
    ClassTree tree = parse("class C extends S { }", Kind.CLASS_DECLARATION);

    assertThat(tree.extendsClause().extendsToken().text()).isEqualTo("extends");
    assertThat(tree.extendsClause().superClass()).isNotNull();
  }

  @Test
  public void flow_implements_clause() throws Exception {
    ClassTree tree = parse("class C extends S implements A, B { }", Kind.CLASS_DECLARATION);

    assertThat(tree.extendsClause()).isNotNull();
    assertThat(tree.implementsClause()).isNotNull();
    assertThat(tree.implementsClause().implementsOrExtendsToken().text()).isEqualTo("implements");
    assertThat(tree.implementsClause().types()).hasSize(2);
  }

  @Test
  public void not_global_class_should_be_declaration() throws Exception {
    ClassTree tree = parse("if (true) { class A{} }", Kind.CLASS_DECLARATION);

    assertThat(tree.is(Kind.CLASS_DECLARATION)).isTrue();
    assertThat(tree.name().name()).isEqualTo("A");
  }

  @Test
  public void property() throws Exception {
    ClassTree tree = parse("class A { @decorator static staticProperty = 1; method(){} withoutInitField; }", Kind.CLASS_DECLARATION);

    FieldDeclarationTree staticProperty = (FieldDeclarationTree) tree.elements().get(0);
    assertThat(staticProperty.decorators()).hasSize(1);
    assertThat(staticProperty.typeAnnotation()).isNull();
    assertThat(staticProperty.staticToken().text()).isEqualTo("static");
    assertThat(((IdentifierTree) staticProperty.propertyName()).name()).isEqualTo("staticProperty");
    assertThat(staticProperty.equalToken().text()).isEqualTo("=");
    assertThat(staticProperty.initializer().is(Kind.NUMERIC_LITERAL)).isTrue();
    assertThat(staticProperty.semicolonToken().text()).isEqualTo(";");

    FieldDeclarationTree withoutInitField = (FieldDeclarationTree) tree.elements().get(2);
    assertThat(withoutInitField.staticToken()).isNull();
    assertThat(((IdentifierTree) withoutInitField.propertyName()).name()).isEqualTo("withoutInitField");
    assertThat(withoutInitField.equalToken()).isNull();
    assertThat(withoutInitField.initializer()).isNull();
    assertThat(withoutInitField.semicolonToken().text()).isEqualTo(";");

  }

  @Test
  public void flow_property_with_type() throws Exception {
    ClassTree tree = parse("class A { a: MyType1 = 1; b: MyType2; static c: MyType3}", Kind.CLASS_DECLARATION);

    FieldDeclarationTree prop1 = (FieldDeclarationTree) tree.elements().get(0);
    FieldDeclarationTree prop2 = (FieldDeclarationTree) tree.elements().get(1);
    FieldDeclarationTree prop3 = (FieldDeclarationTree) tree.elements().get(2);

    assertThat(prop1.typeAnnotation()).isNotNull();
    assertThat(prop2.typeAnnotation()).isNotNull();
    assertThat(prop3.typeAnnotation()).isNotNull();
  }
}
