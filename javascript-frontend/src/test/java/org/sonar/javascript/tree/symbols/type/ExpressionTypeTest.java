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
package org.sonar.javascript.tree.symbols.type;

import org.junit.Before;
import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Type;

import static org.fest.assertions.Assertions.assertThat;

public class ExpressionTypeTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    super.setUp("expressions.js");
  }

  @Test
  public void parenthesised(){
    Symbol par = getSymbol("par1");
    assertThat(par.types().containsOnlyAndUnique(Type.Kind.FUNCTION)).isTrue();

    par = getSymbol("par2");
    assertThat(par.types()).containsOnly(PrimitiveType.UNKNOWN);
  }

}
