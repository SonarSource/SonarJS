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

import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;

import java.io.File;
import java.util.Collection;
import java.util.Iterator;

import static org.fest.assertions.Assertions.assertThat;

public class UsageTest extends JavaScriptTreeModelTest {

  private ScriptTree ROOT_NODE;
  private SymbolModelImpl SYMBOL_MODEL;

  @Before
  public void setUp() throws Exception {
    ROOT_NODE = (ScriptTree) p.parse(new File("src/test/resources/ast/resolve/usage.js"));
    SYMBOL_MODEL = SymbolModelImpl.create(ROOT_NODE, null, null);
  }

  @Test
  public void global_symbols() throws Exception {
    assertThat(usagesFor("a")).hasSize(3);
    assertThat(usagesFor("f")).hasSize(3);

    Collection<Symbol> symbols = SYMBOL_MODEL.getSymbols("b");
    Symbol b = null;
    for (Symbol symbol : symbols){
      if (symbol.scope().tree().is(Tree.Kind.SCRIPT)){
        b = symbol;
      }
    }
    assertThat(b.usages()).hasSize(2);
  }

  @Test
  public void global_build_in_symbols() throws Exception {
    assertThat(usagesFor("eval")).hasSize(2);
  }

  @Test
  public void arguments_build_in_symbol() throws Exception {
    Collection<Symbol> symbols = SYMBOL_MODEL.getSymbols("arguments");
    for (Symbol symbol : symbols){
      if (symbol.scope().tree().is(Tree.Kind.SCRIPT)){
        assertThat(symbol.builtIn()).isFalse();
      } else {
        assertThat(symbol.builtIn()).isTrue();
      }
    }
  }

  @Test
  public void function_symbols() throws Exception {
    assertThat(usagesFor("p1")).hasSize(2);
    assertThat(usagesFor("p2")).hasSize(1);
    Collection<Symbol> symbols = SYMBOL_MODEL.getSymbols("b");
    Symbol b = null;
    for (Symbol symbol : symbols){
      if (symbol.scope().tree().is(Tree.Kind.FUNCTION_DECLARATION)){
        b = symbol;
      }
    }
    assertThat(b.usages()).hasSize(3);
  }

  @Test
  public void function_expression_symbols() throws Exception {
    assertThat(usagesFor("g")).hasSize(2);
  }

  @Test
  public void catch_block_symbols() throws Exception {
    assertThat(usagesFor("e")).hasSize(2);
  }

  @Test
  public void usage_type() throws Exception {
    Collection<Usage> usages = usagesFor("var1");
    assertThat(usages).hasSize(5);
    Iterator<Usage> iterator = usages.iterator();
    int readCounter = 0;
    int writeCounter = 0;
    int declarationCounter = 0;
    while (iterator.hasNext()){
      Usage next = iterator.next();
      readCounter += next.kind().equals(Usage.Kind.READ)||next.kind().equals(Usage.Kind.READ_WRITE) ? 1 : 0;
      writeCounter += next.isWrite() ? 1 : 0;
      declarationCounter += next.isDeclaration() ? 1 : 0;
    }
    assertThat(readCounter).isEqualTo(2);
    assertThat(writeCounter).isEqualTo(3);
    assertThat(declarationCounter).isEqualTo(2);
  }

  public Collection<Usage> usagesFor(String name) {
    return symbol(name).usages();
  }

  public Symbol symbol(String name) {
    return (Symbol) SYMBOL_MODEL.getSymbols(name).toArray()[0];
  }

}
