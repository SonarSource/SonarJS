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
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;

public class SymbolModelImplTest extends JavaScriptTreeModelTest {

  private SymbolModelImpl SYMBOL_MODEL;

  @Before
  public void setUp() throws Exception {
    AstNode root = p.parse(new File("src/test/resources/ast/resolve/symbolModel.js"));
    SYMBOL_MODEL = SymbolModelImpl.create((ScriptTree) root, null, null, null);
  }

  @Test
  public void symbols_filtering(){
    assertThat(SYMBOL_MODEL.getSymbols()).hasSize(14);

    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.FUNCTION)).hasSize(2); // eval, f
    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.PARAMETER)).hasSize(2); // p1, p2

    assertThat(SYMBOL_MODEL.getSymbols("a")).hasSize(3);
    assertThat(SYMBOL_MODEL.getSymbols("arguments")).hasSize(2);
  }

  @Test
  public void symbols_scope(){
    Symbol f = (Symbol)SYMBOL_MODEL.getSymbols("f").toArray()[0];
    Symbol e = (Symbol)SYMBOL_MODEL.getSymbols("e").toArray()[0];
    assertThat(f.scope().tree().is(Tree.Kind.SCRIPT)).isTrue();
    assertThat(e.scope().tree().is(Tree.Kind.CATCH_BLOCK)).isTrue();
  }



}
