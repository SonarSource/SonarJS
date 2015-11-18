/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.javascript.tree.impl.typescript;

import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;

import static org.fest.assertions.Assertions.assertThat;

public class TSClassTreeModelTest extends JavaScriptTreeModelTest {

  @Test
  public void type_parameters() throws Exception {
    ClassTree tree = parse("class C <T1, T2> { }", Kind.CLASS_DECLARATION);

    assertThat(tree.is(Kind.CLASS_DECLARATION)).isTrue();
    assertThat(tree.typeParameters()).isNotNull();
    assertThat(tree.typeParameters().openAngleBracketToken().text()).isEqualTo("<");
    assertThat(tree.typeParameters().closeAngleBracketToken().text()).isEqualTo(">");
    assertThat(tree.typeParameters().typeParameterList()).hasSize(2);
  }

  @Test
  public void extends_clause() throws Exception {
    ClassTree tree = parse("class C extends S { }", Kind.CLASS_DECLARATION);

    assertThat(tree.extendsToken().text()).isEqualTo("extends");
    assertThat(tree.superClass()).isNotNull();
    assertThat(tree.superClass().is(Kind.TS_TYPE_REFERENCE)).isTrue();

    assertThat(tree.implementsToken()).isNull();
    assertThat(tree.implementedTypes()).hasSize(0);
  }

  @Test
  public void implements_clause() throws Exception {
    ClassTree tree = parse("class C implements I1, I2 { }", Kind.CLASS_DECLARATION);

    assertThat(tree.implementsToken().text()).isEqualTo("implements");
    assertThat(tree.implementedTypes()).hasSize(2);
    assertThat(tree.implementedTypes().get(0).is(Kind.TS_TYPE_REFERENCE)).isTrue();
  }

}
