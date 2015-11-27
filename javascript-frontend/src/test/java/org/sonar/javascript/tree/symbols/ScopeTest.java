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
package org.sonar.javascript.tree.symbols;

import java.io.File;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.fest.assertions.Assertions.assertThat;
import static org.junit.Assert.assertNotNull;

public class ScopeTest extends JavaScriptTreeModelTest {

  private ScriptTree ROOT_NODE;
  private SymbolModelImpl SYMBOL_MODEL;

  private Scope getScopeFor(Tree.Kind kind) {
    for (Symbol symbol : SYMBOL_MODEL.getSymbols()) {
      if (symbol.scope().tree().is(kind)) {
        return symbol.scope();
      }
    }
    throw new IllegalStateException();
  }

  @Before
  public void setUp() throws Exception {
    ROOT_NODE = (ScriptTree) p.parse(new File("src/test/resources/ast/resolve/scope.js"));
    SYMBOL_MODEL = SymbolModelImpl.create(ROOT_NODE, null, null);
  }

  @Test
  public void global_scope() throws Exception {
    Scope globalScope = getScopeFor(Tree.Kind.SCRIPT);

    assertThat(globalScope.isGlobal()).isTrue();
    assertNotNull(globalScope.lookupSymbol("a"));
    assertNotNull(globalScope.lookupSymbol("f"));

    // Implicit global declaration: without the "var" keyword
    assertNotNull(globalScope.lookupSymbol("b"));
    assertNotNull(globalScope.lookupSymbol("c"));
  }

  @Test
  public void function_scope() throws Exception {
    Scope functionScope = getScopeFor(Tree.Kind.FUNCTION_DECLARATION);

    assertThat(functionScope.isGlobal()).isFalse();
    assertThat(functionScope.getSymbols(Symbol.Kind.PARAMETER)).hasSize(1);
    assertNotNull(functionScope.lookupSymbol("p"));
    assertNotNull(functionScope.lookupSymbol("a"));
    assertNotNull(functionScope.lookupSymbol("b"));
  }

  @Test
  public void function_expression_scope() throws Exception {
    Scope functionExprScope = getScopeFor(Tree.Kind.FUNCTION_EXPRESSION);

    assertNotNull(functionExprScope.lookupSymbol("a"));
    assertNotNull(functionExprScope.lookupSymbol("x"));
  }

  @Test
  public void catch_block_scope() throws Exception {
    Scope catchScope = getScopeFor(Tree.Kind.CATCH_BLOCK);

    assertNotNull(catchScope.lookupSymbol("e"));
    assertNotNull(catchScope.lookupSymbol("a"));

  }
}
