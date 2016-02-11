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
import java.util.HashSet;
import java.util.Set;
import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.fest.assertions.Assertions.assertThat;

public class ScopeTest extends JavaScriptTreeModelTest {

  private SymbolModelImpl SYMBOL_MODEL;

  private Scope scopeAtLine(int line) {
    for (Scope scope : SYMBOL_MODEL.getScopes()) {
      if (((JavaScriptTree) scope.tree()).getLine() == line) {
        return scope;
      }
    }
    throw new IllegalStateException();
  }

  private Set<String> symbols(Scope scope) {
    Set<String> result = new HashSet<>();
    for (Symbol symbol : scope.symbols.values()) {
      if (!symbol.builtIn()) {
        result.add(symbol.name());
      }
    }
    return result;
  }

  @Before
  public void setUp() throws Exception {
    File file = new File("src/test/resources/ast/resolve/scope.js");
    ScriptTree root = (ScriptTree) p.parse(file);
    SYMBOL_MODEL = SymbolModelImpl.create(root, file, null);
  }

  @Test
  public void scopes_number() throws Exception {
    assertThat(SYMBOL_MODEL.getScopes()).hasSize(21);
  }

  @Test
  public void test_global_scope() throws Exception {
    Scope scope = SYMBOL_MODEL.globalScope();

    assertThat(scope.isGlobal()).isTrue();
    assertThat(scope.isBlock()).isFalse();
    assertThat(scopeAtLine(1)).isEqualTo(scope);
    assertThat(symbols(scope)).containsOnly("a", "b", "f", "const1", "let1", "c", "A", "notBlock", "gen", "catch1", "try2");
  }

  @Test
  public void test_function_scope() throws Exception {
    Scope scope = scopeAtLine(10);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isFalse();
    assertThat(scope.tree().is(Kind.FUNCTION_DECLARATION)).isTrue();
    assertThat(symbols(scope)).containsOnly("p", "a", "b");
    assertThat(scope.getSymbol("a")).isNotEqualTo(scope.outer().getSymbol("a"));
    assertThat(scope.getSymbols(Symbol.Kind.PARAMETER)).hasSize(1);
    assertThat(scope.lookupSymbol("let1")).isNotNull();
    assertThat(scope.lookupSymbol("const1")).isNotNull();
  }

  @Test
  public void test_inner_function() throws Exception {
    Scope scope = scopeAtLine(14);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isFalse();
    assertThat(scope.tree().is(Kind.FUNCTION_EXPRESSION)).isTrue();
    assertThat(symbols(scope)).containsOnly("g", "a", "x");
    assertThat(scope.getSymbol("a")).isNotEqualTo(scope.outer().getSymbol("a"));
  }

  @Test
  public void test_try() throws Exception {
    Scope scope = scopeAtLine(25);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.BLOCK)).isTrue();
    assertThat(symbols(scope)).containsOnly("try1");
  }

  @Test
  public void test_catch() throws Exception {
    Scope scope = scopeAtLine(28);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.CATCH_BLOCK)).isTrue();
    assertThat(symbols(scope)).containsOnly("e");
  }

  @Test
  public void test_finally() throws Exception {
    Scope scope = scopeAtLine(30);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.BLOCK)).isTrue();
    assertThat(symbols(scope)).isEmpty();
  }

  @Test
  public void test_while() throws Exception {
    Scope scope = scopeAtLine(37);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.BLOCK)).isTrue();
    assertThat(symbols(scope)).containsOnly("while1");
  }

  @Test
  public void test_do_while() throws Exception {
    Scope scope = scopeAtLine(42);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.BLOCK)).isTrue();
    assertThat(symbols(scope)).containsOnly("doWhile1");
  }

  @Test
  public void test_for_of() throws Exception {
    Scope scope = scopeAtLine(49);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.FOR_OF_STATEMENT)).isTrue();
    assertThat(symbols(scope)).containsOnly("let3", "const1", "const2", "let2");
    assertThat(scope.getSymbol("const1")).isNotEqualTo(scope.outer().getSymbol("const1"));
    assertThat(scope.lookupSymbol("const1")).isNotEqualTo(scope.outer().getSymbol("const1"));
    assertThat(scope.lookupSymbol("let1")).isEqualTo(scope.outer().getSymbol("let1"));
  }

  @Test
  public void test_for_in() throws Exception {
    Scope scope = scopeAtLine(58);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.FOR_IN_STATEMENT)).isTrue();
    assertThat(symbols(scope)).containsOnly("let4");
  }

  @Test
  public void test_for() throws Exception {
    Scope scope = scopeAtLine(63);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.FOR_STATEMENT)).isTrue();
    assertThat(symbols(scope)).containsOnly("let5");
  }

  @Test
  public void test_if() throws Exception {
    Scope scope = scopeAtLine(69);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.BLOCK)).isTrue();
    assertThat(symbols(scope)).isEmpty();
  }

  @Test
  public void test_else() throws Exception {
    Scope scope = scopeAtLine(70);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.BLOCK)).isTrue();
    assertThat(symbols(scope)).isEmpty();
  }

  @Test
  public void test_switch() throws Exception {
    Scope scope = scopeAtLine(75);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.SWITCH_STATEMENT)).isTrue();
    assertThat(symbols(scope)).containsOnly("let6");
  }

  @Test
  public void test_generator() throws Exception {
    Scope scope = scopeAtLine(82);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isFalse();
    assertThat(scope.tree().is(Kind.GENERATOR_DECLARATION)).isTrue();
    assertThat(symbols(scope)).isEmpty();
  }

  @Test
  public void test_class() throws Exception {
    Scope scope = scopeAtLine(86);

    assertThat(scope.isGlobal()).isFalse();
    assertThat(scope.isBlock()).isTrue();
    assertThat(scope.tree().is(Kind.CLASS_DECLARATION)).isTrue();
    assertThat(symbols(scope)).isEmpty();
  }

  @Test
  public void test_methods() throws Exception {
    Scope methodScope = scopeAtLine(87);

    assertThat(methodScope.isGlobal()).isFalse();
    assertThat(methodScope.isBlock()).isFalse();
    assertThat(methodScope.tree().is(Kind.METHOD)).isTrue();
    assertThat(symbols(methodScope)).isEmpty();


    Scope generatorScope = scopeAtLine(90);

    assertThat(generatorScope.isGlobal()).isFalse();
    assertThat(generatorScope.isBlock()).isFalse();
    assertThat(generatorScope.tree().is(Kind.GENERATOR_METHOD)).isTrue();
    assertThat(symbols(generatorScope)).isEmpty();


    Scope setterScope = scopeAtLine(93);

    assertThat(setterScope.isGlobal()).isFalse();
    assertThat(setterScope.isBlock()).isFalse();
    assertThat(setterScope.tree().is(Kind.SET_METHOD)).isTrue();
    assertThat(symbols(setterScope)).containsOnly("v");
  }

  @Test
  public void test_arrow_function() throws Exception {
    Scope scope1 = scopeAtLine(99);

    assertThat(scope1.isGlobal()).isFalse();
    assertThat(scope1.isBlock()).isFalse();
    assertThat(scope1.tree().is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(symbols(scope1)).containsOnly("p1");


    Scope scope2 = scopeAtLine(100);

    assertThat(scope2.isGlobal()).isFalse();
    assertThat(scope2.isBlock()).isFalse();
    assertThat(scope2.tree().is(Kind.ARROW_FUNCTION)).isTrue();
    assertThat(symbols(scope2)).containsOnly("p2", "x");

  }

}
