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
package org.sonar.javascript.ast.resolve.type;

import static org.fest.assertions.Assertions.assertThat;

import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;

public class MultiTypesTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    super.setUp("multitypes.js");
  }

  @Test
  public void two_literal_assignments(){
    Symbol a = getSymbol("a");
    assertThat(a.types()).hasSize(2);
    assertThat(a.types()).contains(PrimitiveType.NUMBER, PrimitiveType.STRING);

    Symbol b = getSymbol("b");
    assertThat(b.types()).hasSize(2);
    assertThat(b.types()).contains(PrimitiveType.STRING);
    assertThat(b.canBe(Type.Kind.ARRAY)).isTrue();
  }

  @Test
  public void identifier_assignment() {
    Symbol d = getSymbol("d");
    Symbol b = getSymbol("b");

    assertThat(d.types()).hasSize(2);
    assertThat(b.types()).isEqualTo(d.types());

    Symbol c = getSymbol("c");
    Symbol a = getSymbol("a");

    // FIXME: could the type be narrowed down from [NUM, STR] to [STR] ?
    assertThat(c.types()).hasSize(2);
    assertThat(a.types()).isEqualTo(c.types());
  }

}
