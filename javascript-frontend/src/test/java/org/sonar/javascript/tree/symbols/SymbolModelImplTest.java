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
import org.junit.Test;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;

public class SymbolModelImplTest extends JavaScriptTreeModelTest {

  private SymbolModelImpl SYMBOL_MODEL = symbolModel(new File("src/test/resources/ast/resolve/symbolModel.js"));

  @Test
  public void symbols_filtering() {
    assertThat(SYMBOL_MODEL.getSymbols()).hasSize(21);

    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.FUNCTION)).hasSize(3); // eval, f, func
    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.PARAMETER)).hasSize(2); // p1, p2
    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.VARIABLE)).hasSize(15);  // a, a, arguments, arguments, b, c, e, i, Infinity, NaN, this, this, this, undefined, window

    assertThat(SYMBOL_MODEL.getSymbols("a")).hasSize(3);
    assertThat(SYMBOL_MODEL.getSymbols("arguments")).hasSize(2);
    assertThat(SYMBOL_MODEL.getSymbols("this")).hasSize(3);
    assertThat(SYMBOL_MODEL.getSymbols("undefined")).hasSize(1);
    assertThat(SYMBOL_MODEL.getSymbols("NaN")).hasSize(1);
    assertThat(SYMBOL_MODEL.getSymbols("Infinity")).hasSize(1);
  }

  @Test
  public void symbols_scope() {
    Symbol f = (Symbol) SYMBOL_MODEL.getSymbols("f").toArray()[0];
    Symbol e = (Symbol) SYMBOL_MODEL.getSymbols("e").toArray()[0];
    assertThat(f.scope().tree().is(Tree.Kind.SCRIPT)).isTrue();
    assertThat(e.scope().tree().is(Tree.Kind.CATCH_BLOCK)).isTrue();
  }

  @Test
  public void for_object_loops() throws Exception {
    Symbol i = (Symbol) SYMBOL_MODEL.getSymbols("i").toArray()[0];
    assertThat(i.usages()).hasSize(2);
  }

  @Test
  public void override_symbol_kind() throws Exception {
    Symbol func = (Symbol) SYMBOL_MODEL.getSymbols("func").toArray()[0];
    assertThat(func.is(Kind.FUNCTION)).isTrue();
  }
}
