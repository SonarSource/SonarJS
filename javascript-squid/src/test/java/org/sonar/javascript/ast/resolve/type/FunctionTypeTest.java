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
import org.sonar.javascript.ast.resolve.SymbolModelImpl;
import org.sonar.plugins.javascript.api.tree.ScriptTree;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;

public class FunctionTypeTest extends TypeTest {

  @Before
  public void setUp() throws Exception {
    ROOT_NODE = p.parse(new File("src/test/resources/ast/resolve/type/functionType.js"));
    SYMBOL_MODEL = SymbolModelImpl.create((ScriptTree) ROOT_NODE, null, null);
  }

  @Test
  public void function_declaration(){
    Symbol f1 = getSymbol("f1");
    assertThat(f1.types()).hasSize(1);
    assertThat(f1.canBe(Type.Kind.FUNCTION)).isTrue();
  }

  @Test
  public void function_expression() {
    Symbol f2 = getSymbol("f2");
    assertThat(f2.types()).hasSize(1);
    assertThat(f2.canBe(Type.Kind.FUNCTION)).isTrue();
  }

  @Test
  public void function_call() {
    Symbol p1 = getSymbol("p1");
    assertThat(p1.types()).hasSize(1);
    assertThat(p1.canBe(Type.Kind.NUMBER)).isTrue();

    Symbol p2 = getSymbol("p2");
    assertThat(p2.types()).hasSize(2);
    assertThat(p2.canBe(Type.Kind.STRING)).isTrue();
    assertThat(p2.canBe(Type.Kind.NUMBER)).isTrue();

    Symbol p3 = getSymbol("p3");
    assertThat(p3.types()).hasSize(1);
    assertThat(p3.canBe(Type.Kind.BOOLEAN)).isTrue();
  }

}