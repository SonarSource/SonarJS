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

import com.sonar.sslr.api.AstNode;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.model.JavaScriptTreeModelTest;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;
import static org.junit.Assert.assertNotNull;

public class ScopeTest extends JavaScriptTreeModelTest {

  private AstNode ROOT_NODE;
  private SymbolModelImpl SYMBOL_MODEL;

  private Scope getScopeFor(Tree.Kind kind){
    for (Symbol symbol : SYMBOL_MODEL.getSymbols()){
      if (symbol.scope().tree().is(kind)){
        return symbol.scope();
      }
    }
    throw new IllegalStateException();
  }

  @Before
  public void setUp() throws Exception {
    ROOT_NODE = p.parse(new File("src/test/resources/ast/resolve/scope.js"));
    SYMBOL_MODEL = SymbolModelImpl.create((ScriptTree) ROOT_NODE, null, null);
  }

  @Test
  public void global_scope() throws Exception {
    Scope globalScope = getScopeFor(Tree.Kind.SCRIPT);

    assertNotNull(globalScope.lookupSymbol("a"));
    assertNotNull(globalScope.lookupSymbol("f"));

    // Implicit global declaration: without the "var" keyword
    assertNotNull(globalScope.lookupSymbol("b"));
    assertNotNull(globalScope.lookupSymbol("c"));
  }

  @Test
  public void function_scope() throws Exception {
    Scope functionScope = getScopeFor(Tree.Kind.FUNCTION_DECLARATION);

    assertNotNull(functionScope.lookupSymbol("p"));
    assertNotNull(functionScope.lookupSymbol("a"));
    assertNotNull(functionScope.lookupSymbol("b"));
  }

  @Test
  public void function_expression_scope() throws Exception {
    Scope functionExprScope = getScopeFor(Tree.Kind.FUNCTION_EXPRESSION);

    assertNotNull(functionExprScope.lookupSymbol("a"));

    // redeclared variable
    assertNotNull(functionExprScope.lookupSymbol("x"));
    assertThat(functionExprScope.lookupSymbol("x").declarations()).hasSize(2);
    assertThat(((JavaScriptTree) functionExprScope.lookupSymbol("x").declarations().get(0).tree()).getTokenLine()).isEqualTo(18);
    assertThat(((JavaScriptTree) functionExprScope.lookupSymbol("x").declarations().get(1).tree()).getTokenLine()).isEqualTo(20);
  }

  @Test
  public void catch_block_scope() throws Exception {
    Scope catchScope = getScopeFor(Tree.Kind.CATCH_BLOCK);

    assertNotNull(catchScope.lookupSymbol("e"));
    assertNotNull(catchScope.lookupSymbol("a"));

  }
}
