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

import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.ast.resolve.Symbol;

import static org.fest.assertions.Assertions.assertThat;

public class FalsePositiveTest extends TypeTest {
  @Before
  public void setUp() throws Exception {
    super.setUp("falsePositive.js");
  }

  @Test
  public void undefined_type(){
    Symbol p1 = getSymbol("p1");
    // should be 2, but it's impossible to infer second type from the source code
    assertThat(p1.types()).hasSize(1);
    assertThat(p1.canBe(Type.Kind.ARRAY)).isTrue();
  }

}
