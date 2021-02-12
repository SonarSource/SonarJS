/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
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

import com.google.common.collect.Iterables;
import java.util.Set;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Configuration;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.javascript.utils.TestUtils;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;

public class SymbolModelImplTest extends JavaScriptTreeModelTest {

  private static final InputFile INPUT_FILE = TestUtils.createTestInputFile("src/test/resources/ast/resolve/symbolModel.js");
  private SymbolModelImpl SYMBOL_MODEL = symbolModel(INPUT_FILE);

  @Test
  public void symbols_filtering() {
    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.FUNCTION)).extracting("name").containsOnly("f", "func", "flowGenerics");
    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.PARAMETER)).extracting("name").containsOnly("p1", "p2", "p3");
    assertThat(SYMBOL_MODEL.getSymbols(Symbol.Kind.FLOW_GENERIC_TYPE)).extracting("name").containsOnly("T");

    assertThat(SYMBOL_MODEL.getSymbols("a")).hasSize(3);
    assertThat(SYMBOL_MODEL.getSymbols("arguments")).hasSize(3);
    assertThat(SYMBOL_MODEL.getSymbols("this")).hasSize(4);
    assertThat(SYMBOL_MODEL.getSymbols("Object")).hasSize(1);
    assertThat(SYMBOL_MODEL.getSymbols("window")).hasSize(1);
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

  @Test
  public void environment() throws Exception {
    assertThat(symbolModel(INPUT_FILE, config("", "")).getSymbols("document")).hasSize(0);
    assertThat(symbolModel(INPUT_FILE, config("xxx", "")).getSymbols("document")).hasSize(0);
    assertThat(symbolModel(INPUT_FILE, config("browser", "")).getSymbols("document")).hasSize(1);
  }

  @Test
  public void global_variable() throws Exception {
    assertThat(symbolModel(INPUT_FILE, config("", "")).getSymbols("global1")).hasSize(0);
    assertThat(symbolModel(INPUT_FILE, config("", "global1")).getSymbols("global1")).hasSize(1);
  }

  @Test
  public void flowed_let() throws Exception {
     assertThat(SYMBOL_MODEL.getSymbols("flowed")).hasSize(1);
  }

  @Test
  public void destructuring_let() throws Exception {
     assertThat(SYMBOL_MODEL.getSymbols("arra")).hasSize(1);
     assertThat(SYMBOL_MODEL.getSymbols("arrb")).hasSize(1);
  }

  @Test
  public void flow_interface() {
    Symbol flowInterface = Iterables.getOnlyElement(SYMBOL_MODEL.getSymbols("FlowInterface"));
    assertThat(flowInterface.kind()).isEqualTo(Kind.FLOW_TYPE);
  }

  private Configuration config(String environmentNames, String globalNames) {
    MapSettings settings = new MapSettings();
    settings.setProperty(GlobalVariableNames.ENVIRONMENTS_PROPERTY_KEY, environmentNames);
    settings.setProperty(GlobalVariableNames.GLOBALS_PROPERTY_KEY, globalNames);
    return settings.asConfig();
  }
}
