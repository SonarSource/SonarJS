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
package org.sonar.javascript.se;

import com.google.common.base.Charsets;
import com.google.common.collect.HashMultimap;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.SetMultimap;
import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import org.junit.Test;
import org.sonar.api.config.Settings;
import org.sonar.javascript.parser.JavaScriptParserBuilder;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;

import static org.fest.assertions.Assertions.assertThat;

public class SymbolicExecutionTest {

  private DummySeCheck check = new DummySeCheck();

  @Test
  public void empty_function() throws Exception {
    runSe("empty_function.js");

    assertThat(check.endOfExecution).isTrue();
  }

  @Test
  public void block_execution_limit() throws Exception {
    runSe("block_execution_limit.js");
    assertThat(check.endOfExecution).isFalse();
  }

  @Test
  public void try_catch() throws Exception {
    runSe("try_catch.js");
    assertThat(check.endOfExecution).isFalse();
  }

  @Test
  public void initial_value() throws Exception {
    runSe("initial_value.js");
  }

  @Test
  public void assignment() throws Exception {
    runSe("assignment.js");
  }

  @Test
  public void stop_after_npe() throws Exception {
    runSe("stop_after_npe.js");
  }

  private void runSe(String filename) {
    JavaScriptVisitorContext context = createContext(new File("src/test/resources/se/", filename));
    check.scanTree(context);
    SeChecksDispatcher seChecksDispatcher = new SeChecksDispatcher(ImmutableList.of((SeCheck) check));
    seChecksDispatcher.scanTree(context);
  }

  private static JavaScriptVisitorContext createContext(File file) {
    ScriptTree scriptTree = (ScriptTree) JavaScriptParserBuilder.createParser(Charsets.UTF_8).parse(file);
    return new JavaScriptVisitorContext(scriptTree, file, new Settings());
  }

  private static class DummySeCheck extends SeCheck {

    private static Map<String, SymbolicValue> SYMBOLIC_VALUE_KEYS = ImmutableMap.of(
      "NULL", SymbolicValue.NULL_OR_UNDEFINED,
      "NOT_NULL", SymbolicValue.UNKNOWN.constrain(Nullability.NOT_NULL),
      "TRUTHY", SymbolicValue.TRUTHY_LITERAL,
      "FALSY", SymbolicValue.FALSY_LITERAL,
      "UNKNOWN", SymbolicValue.UNKNOWN
    );

    Map<Integer, ProgramState> expectedProgramStates;
    SetMultimap<Integer, Symbol> expectedAbsentSymbols;

    private boolean insideFunction = false;
    boolean endOfExecution;
    ProgramState previousPS;
    int previousPSLine;

    @Override
    public void visitFile(Tree scriptTree) {
      expectedProgramStates = new HashMap<>();
      expectedAbsentSymbols = HashMultimap.create();
    }

    @Override
    public List<Kind> nodesToVisit() {
      return ImmutableList.of(Kind.TOKEN);
    }

    @Override
    public void startOfExecution(Scope functionScope) {
      if (functionScope.tree().is(Kind.FUNCTION_DECLARATION) && ((FunctionDeclarationTree) functionScope.tree()).name().name().equals("main")) {
        insideFunction = true;
        endOfExecution = false;
        previousPS = null;
      } else {
        insideFunction = false;
      }
    }

    @Override
    public void visitNode(Tree tree) {
      SyntaxToken token = (SyntaxToken) tree;

      for (SyntaxTrivia comment : token.trivias()) {
        ProgramState ps = ProgramState.emptyState();
        String text = comment.text().substring(2).trim();

        for (String oneSymbolValue : text.split("&")) {
          oneSymbolValue = oneSymbolValue.trim();
          if (!oneSymbolValue.startsWith("!")) {
            String[] pair = oneSymbolValue.split("=");
            if (getContext().getSymbolModel().getSymbols(pair[0]).isEmpty()) {
              System.out.println("");
            }
            Symbol symbol = getContext().getSymbolModel().getSymbols(pair[0]).iterator().next();
            ps = ps.copyAndAddValue(symbol, parseSymbolicValue(pair[1]));

          } else {
            Symbol symbol = getContext().getSymbolModel().getSymbols(oneSymbolValue.substring(1)).iterator().next();
            expectedAbsentSymbols.put(comment.line(), symbol);

          }
        }

        expectedProgramStates.put(comment.line(), ps);
      }

    }

    private static SymbolicValue parseSymbolicValue(String value) {
      return SYMBOLIC_VALUE_KEYS.get(value);
    }

    @Override
    public void afterBlockElement(ProgramState currentState, Tree element) {
      int line = ((JavaScriptTree) element).getLine();

      if (previousPS != null && line > previousPSLine) {
        ProgramState expectedProgramState = expectedProgramStates.get(previousPSLine);
        if (expectedProgramState != null) {
          for (Entry<Symbol, SymbolicValue> entry : expectedProgramState.valuesBySymbol.entrySet()) {
            SymbolicValue symbolicValue = previousPS.get(entry.getKey());
            assertThat(symbolicValue).isNotNull();
            assertThat(symbolicValue).isEqualTo(entry.getValue());
          }

          for (Symbol expectedAbsentSymbol : expectedAbsentSymbols.get(previousPSLine)) {
            assertThat(previousPS.get(expectedAbsentSymbol)).isNull();
          }
        }

      }

      previousPS = currentState;
      previousPSLine = line;
    }

    @Override
    public void endOfExecution(Scope functionScope) {
      if (insideFunction) {
        this.endOfExecution = true;
      }
    }
  }

}
