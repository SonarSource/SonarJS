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
package org.sonar.javascript.ast.resolve;

import static org.fest.assertions.Assertions.assertThat;

import java.io.File;

import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.tree.ScriptTree;

import com.sonar.sslr.api.AstNode;

public class TypeVisitorTest extends JavaScriptTreeModelTest {

  private AstNode ROOT_NODE;
  private SymbolModelImpl SYMBOL_MODEL;

  @Before
  public void setUp() throws Exception {
    ROOT_NODE = p.parse(new File("src/test/resources/ast/resolve/types.js"));
    SYMBOL_MODEL = SymbolModelImpl.create((ScriptTree) ROOT_NODE, null, null);
  }

  @Test
  public void number_declaration() throws Exception {
    Symbol num = getSymbol("num1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.NUMBER);
  }

  @Test
  public void number_assignment() throws Exception {
    Symbol num = getSymbol("num2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.NUMBER);
  }

  @Test
  public void string_declaration() throws Exception {
    Symbol num = getSymbol("str1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.STRING);
  }

  @Test
  public void string_assignment() throws Exception {
    Symbol num = getSymbol("str2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.STRING);
  }

  @Test
  public void boolean_declaration() throws Exception {
    Symbol num = getSymbol("bool1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.BOOLEAN);
  }

  @Test
  public void boolean_assignment() throws Exception {
    Symbol num = getSymbol("bool2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.BOOLEAN);
  }

  @Test
  public void array_declaration() throws Exception {
    Symbol num = getSymbol("arr1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.ARRAY);
  }

  @Test
  public void array_assignment() throws Exception {
    Symbol num = getSymbol("arr2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.ARRAY);
  }

  @Test
  public void object_declaration() throws Exception {
    Symbol num = getSymbol("obj1");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.OBJECT);
  }

  @Test
  public void object_assignment() throws Exception {
    Symbol num = getSymbol("obj2");
    assertThat(num.types()).hasSize(1);
    assertThat(num.types()).contains(Type.OBJECT);
  }

  private Symbol getSymbol(String name) {
    return SYMBOL_MODEL.getSymbols(name).iterator().next();
  }
}
