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
package org.sonar.javascript.parser.declarations;

import org.junit.Test;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.sonar.javascript.utils.Assertions.assertThat;

public class ClassDeclarationTest {


  @Test
  public void ok() {
    assertThat(Kind.CLASS_DECLARATION)
      .matches("class C {}")
      .matches("class C extends S {}")
      .matches("class C { ; }")
      .matches("class C extends S { ; }");
  }

  @Test
  public void with_properties() throws Exception {
    assertThat(Kind.CLASS_DECLARATION)
      .matches("class C {property; method(){} }")
      .matches("class C {method(){} property; }")
      .matches("class C { property; property=42; }")
    ;
  }

  @Test
  public void with_decorators() throws Exception {
    assertThat(Kind.CLASS_DECLARATION)
      .matches("@decorator class A {}")
      .matches("@decorator1 @decorator2 class A {}")
      .matches("class C { @decorator method(){} }")
      .matches("class C { @decorator property1; @decorator1 @decorator2 property2=42; @decorator static property3=42 }")
      .matches("class C { @decorator static method(){} }")
      .matches("class C { @decorator1 @decorator2 method(){} }")
    ;
  }

  @Test
  public void flow() throws Exception {
    assertThat(Kind.CLASS_DECLARATION)
      .matches("class C {property: number; method():number{} }")
      .matches("class C extends A.B<D> { }")
    ;
  }
}
