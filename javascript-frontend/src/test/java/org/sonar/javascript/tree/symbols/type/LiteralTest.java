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
package org.sonar.javascript.tree.symbols.type;

import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;

import static org.assertj.core.api.Assertions.assertThat;

public class LiteralTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    super.setUp("literals.js");
  }

  @Test
  public void number_declaration() throws Exception {
    Symbol num = getSymbol("num1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(PrimitiveType.NUMBER);
  }

  @Test
  public void number_assignment() throws Exception {
    Symbol num = getSymbol("num2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(PrimitiveType.NUMBER);
  }

  @Test
  public void string_declaration() throws Exception {
    Symbol num = getSymbol("str1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(PrimitiveType.STRING);
  }

  @Test
  public void string_assignment() throws Exception {
    Symbol num = getSymbol("str2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(PrimitiveType.STRING);
  }

  @Test
  public void boolean_declaration() throws Exception {
    Symbol num = getSymbol("bool1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(PrimitiveType.BOOLEAN);
  }

  @Test
  public void boolean_assignment() throws Exception {
    Symbol num = getSymbol("bool2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(PrimitiveType.BOOLEAN);
  }

  @Test
  public void array_declaration() throws Exception {
    Symbol num = getSymbol("arr1");
    assertThat(num.types().containsOnlyAndUnique(Type.Kind.ARRAY)).isTrue();
  }

  @Test
  public void array_assignment() throws Exception {
    Symbol num = getSymbol("arr2");
    assertThat(num.types().containsOnlyAndUnique(Type.Kind.ARRAY)).isTrue();
  }

  @Test
  public void object_declaration() throws Exception {
    Symbol obj = getSymbol("obj1");
    assertThat(obj.types().containsOnlyAndUnique(Type.Kind.OBJECT)).isTrue();
  }

  @Test
  public void object_assignment() throws Exception {
    Symbol obj = getSymbol("obj2");
    assertThat(obj.types().containsOnlyAndUnique(Type.Kind.OBJECT)).isTrue();
  }
}
