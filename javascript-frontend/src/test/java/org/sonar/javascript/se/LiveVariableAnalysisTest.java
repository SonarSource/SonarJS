/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.se;

import java.util.Set;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.se.LiveVariableAnalysis.Usages;
import org.sonar.javascript.utils.TestUtils;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.utils.TestUtils.createContext;

public class LiveVariableAnalysisTest {

  @Test
  public void testUsages() throws Exception {
    InputFile inputFile = TestUtils.createTestInputFile("src/test/resources/se/", "lva.js");
    JavaScriptVisitorContext context = createContext(inputFile);
    FunctionTree function = (FunctionTree) context.getTopTree().items().items().get(0);
    ControlFlowGraph cfg = ControlFlowGraph.build((BlockTree) function.body());
    LiveVariableAnalysis lva = LiveVariableAnalysis.create(cfg, context.getSymbolModel().getScope(function));

    Usages usages = lva.getUsages();
    Set<Symbol> neverReadSymbols = usages.neverReadSymbols();
    assertThat(neverReadSymbols).hasSize(1);
    Symbol neverReadSymbol = neverReadSymbols.iterator().next();
    assertThat(neverReadSymbol.name()).isEqualTo("neverRead");
    assertThat(usages.hasUsagesInNestedFunctions(neverReadSymbol)).isFalse();
  }

}
