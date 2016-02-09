/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.javascript.tree.symbols;

import java.io.File;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.fest.assertions.Assertions.assertThat;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

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
    assertNotNull(globalScope.getSymbol("a"));
    assertNotNull(globalScope.getSymbol("f"));

    // Implicit global declaration: without the "var" keyword
    assertNotNull(globalScope.getSymbol("b"));
    assertNotNull(globalScope.getSymbol("c"));

    // ES2015
    assertNotNull(globalScope.getSymbol("const1"));
    assertNotNull(globalScope.getSymbol("let1"));
  }

  @Test
  public void function_scope() throws Exception {
    Scope functionScope = getScopeFor(Tree.Kind.FUNCTION_DECLARATION);

    assertThat(functionScope.isGlobal()).isFalse();
    assertThat(functionScope.getSymbols(Symbol.Kind.PARAMETER)).hasSize(1);
    assertNotNull(functionScope.getSymbol("p"));
    assertNotNull(functionScope.getSymbol("a"));
    assertNotNull(functionScope.getSymbol("b"));

    assertNotNull(functionScope.lookupSymbol("let1"));
    assertNull(functionScope.getSymbol("let1"));
    assertNotNull(functionScope.lookupSymbol("const1"));
    assertNull(functionScope.getSymbol("const1"));
  }

  @Test
  public void block_scopes() throws Exception {
    assertNotNull(getScopeFor(Kind.BLOCK));
    assertNotNull(getScopeFor(Kind.FOR_IN_STATEMENT));
    assertNotNull(getScopeFor(Kind.FOR_OF_STATEMENT));
    assertNotNull(getScopeFor(Kind.FOR_STATEMENT));
    assertNotNull(getScopeFor(Kind.SWITCH_STATEMENT));
  }

  @Test
  public void block_scope_variables() throws Exception {
    Scope blockScope = getScopeFor(Kind.FOR_OF_STATEMENT);

    assertNull(blockScope.getSymbol("let1"));
    assertNotNull(blockScope.lookupSymbol("let1"));
    assertNotNull(blockScope.getSymbol("let2"));

    assertNotNull(blockScope.getSymbol("const1"));
    assertNotNull(blockScope.getSymbol("const2"));

    assertNull(blockScope.getSymbol("notBlock"));
    assertNotNull(blockScope.lookupSymbol("notBlock"));

    assertThat(blockScope.getSymbol("const1")).isNotEqualTo(SYMBOL_MODEL.globalScope().getSymbol("const1"));
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
