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
package org.sonar.javascript.se;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Multimap;
import com.google.common.collect.SetMultimap;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.visitors.JavaScriptVisitorContext;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

import static org.assertj.core.api.Assertions.assertThat;

class SeVerifier extends SeCheck {

  private static final Map<String, Constraint> SYMBOLIC_VALUE_KEYS = ImmutableMap.<String, Constraint>builder()
    .put("NULLY", Constraint.NULL_OR_UNDEFINED)
    .put("NOT_NULLY", Constraint.NOT_NULLY)
    .put("NOT_NULL", Constraint.NULL.not())
    .put("TRUTHY", Constraint.TRUTHY)
    .put("FALSY", Constraint.FALSY)
    .put("NULL", Constraint.NULL)
    .put("UNDEFINED", Constraint.UNDEFINED)
    .put("NAN", Constraint.NAN)
    .put("NOT_UNDEFINED", Constraint.UNDEFINED.not())
    .put("NULL_OR_NON_FUNCTION_OBJECT", Constraint.NULL.or(Constraint.OBJECT).and(Constraint.FUNCTION.not()))
    .put("NOT_NULL_OR_NON_FUNCTION_OBJECT", Constraint.NULL.or(Constraint.OBJECT).and(Constraint.FUNCTION.not()).not())
    .put("ZERO", Constraint.ZERO)
    .put("NOT_ZERO", Constraint.ZERO.not())
    .put("NOT_ZERO_NUMBER", Constraint.ZERO.not().and(Constraint.NUMBER_PRIMITIVE))
    .put("TRUTHY_NUMBER", Constraint.TRUTHY_NUMBER_PRIMITIVE)
    .put("FUNCTION", Constraint.FUNCTION)
    .put("NOT_FUNCTION", Constraint.FUNCTION.not())
    .put("NUMBER", Constraint.NUMBER_PRIMITIVE)
    .put("POS_NUMBER", Constraint.POSITIVE_NUMBER_PRIMITIVE)
    .put("NEG_NUMBER", Constraint.NEGATIVE_NUMBER_PRIMITIVE)
    .put("NOT_NUMBER", Constraint.NUMBER_PRIMITIVE.not())
    .put("NUMBER_OBJECT", Constraint.NUMBER_OBJECT)
    .put("STRING", Constraint.STRING_PRIMITIVE)
    .put("NOT_STRING", Constraint.STRING_PRIMITIVE.not())
    .put("TRUTHY_STRING", Constraint.TRUTHY_STRING_PRIMITIVE)
    .put("BOOLEAN", Constraint.BOOLEAN_PRIMITIVE)
    .put("NOT_BOOLEAN", Constraint.BOOLEAN_PRIMITIVE.not())
    .put("BOOLEAN_OBJECT", Constraint.BOOLEAN_OBJECT)
    .put("TRUE", Constraint.TRUE)
    .put("FALSE", Constraint.FALSE)
    .put("OTHER_OBJECT", Constraint.OTHER_OBJECT)
    .put("OBJECT", Constraint.OBJECT)
    .put("ANY_VALUE", Constraint.ANY_VALUE)
    .put("ARRAY", Constraint.ARRAY)
    .put("DATE", Constraint.DATE)
    .put("REGEXP", Constraint.REGEXP)
    .put("UNDEFINED_OR_POS_NUMBER", Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.UNDEFINED))
    .build();

  // line - program state - asserted
  private Map<Integer, Map<ProgramState, Boolean>> expectedProgramStates;

  // line - program states
  private Multimap<Integer, ProgramState> actualProgramStates = HashMultimap.create();

  private SetMultimap<Integer, Symbol> expectedAbsentSymbols;
  private boolean insideFunction = false;

  boolean endOfExecution;
  private ProgramState previousPS;
  private int previousPSLine;

  void verify() {
    assertThat(endOfExecution)
      .overridingErrorMessage("Symbolic Execution wasn't finished.")
      .isTrue();

    for (Entry<Integer, Collection<ProgramState>> actualPsEntry : actualProgramStates.asMap().entrySet()) {
      if (expectedProgramStates.containsKey(actualPsEntry.getKey())) {
        for (ProgramState actualPs : actualPsEntry.getValue()) {
          boolean find = findCorresponding(actualPs, expectedProgramStates.get(actualPsEntry.getKey()));
          assertThat(find)
            .overridingErrorMessage(getNotFoundPsMessage(actualPs, actualPsEntry.getKey()))
            .isTrue();
        }
      }

      for (Symbol expectedAbsentSymbol : expectedAbsentSymbols.get(actualPsEntry.getKey())) {
        for (ProgramState actualProgramState : actualPsEntry.getValue()) {
          assertThat(actualProgramState.getSymbolicValue(expectedAbsentSymbol))
            .overridingErrorMessage(getAbsentSymbolMessage(actualProgramState, expectedAbsentSymbol, actualPsEntry.getKey()))
            .isNull();
        }
      }
    }

    for (Entry<Integer, Map<ProgramState, Boolean>> expectedPsEntry : expectedProgramStates.entrySet()) {
      for (Entry<ProgramState, Boolean> programStateBooleanEntry : expectedPsEntry.getValue().entrySet()) {
        assertThat(programStateBooleanEntry.getValue())
          .overridingErrorMessage("Expected program state on line " + expectedPsEntry.getKey() + " was not asserted.\n" + programState(programStateBooleanEntry.getKey()))
          .isTrue();
      }
    }
  }

  private String getAbsentSymbolMessage(ProgramState actualPs, Symbol expectedAbsentSymbol, int line) {
    return String.format(
      "Symbol '%s' was expected to be absent on line %s, but was found in following actual program state:\n%s",
      expectedAbsentSymbol,
      line,
      programState(actualPs)
    );
  }

  private String getNotFoundPsMessage(ProgramState actualPs, Integer line) {
    return "There is an actual program state for which we were not able to match with any expected program state (line " + line + ")\n" + "Actual program state:\n" + programState(actualPs);
  }

  private String programState(ProgramState ps) {
    StringBuilder sb = new StringBuilder();
    for (Symbol symbol : ps.values().keySet()) {
      sb.append(symbol);
      sb.append(" - ");
      sb.append(ps.getConstraint(symbol));
      sb.append("\n");
    }
    return sb.toString();
  }

  private boolean findCorresponding(ProgramState actualPs, Map<ProgramState, Boolean> expectedProgramStates) {
    for (ProgramState expectedPs : expectedProgramStates.keySet()) {

      // fixme(Lena) : do we want to check here only ones that are not checked before?
      boolean allExpectedSymbolsMatched = true;
      for (Symbol expectedSymbol : expectedPs.values().keySet()) {
        Constraint actualSymbolicValue = actualPs.getConstraint(expectedSymbol);
        if (actualSymbolicValue == null || !actualSymbolicValue.equals(expectedPs.getConstraint(expectedSymbol))) {
          allExpectedSymbolsMatched = false;
          break;
        }
      }
      if (allExpectedSymbolsMatched) {
        expectedProgramStates.put(expectedPs, true);
        return true;
      }

    }
    return false;
  }

  void scanExpectedIssues(JavaScriptVisitorContext context) {
    (new CommentParser()).scanTree(context);
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

  private static Constraint parseSymbolicValue(String value) {
    if (value.equals("ANY_VALUE")) {
      return null;
    }
    Constraint constraint = SYMBOLIC_VALUE_KEYS.get(value);
    if (constraint == null) {
      throw new IllegalStateException("Constraint for string \"" + value + "\" is not found");
    }
    return constraint;
  }

  @Override
  public void afterBlockElement(ProgramState currentState, Tree element) {
    int line = element.firstToken().line();

    if (previousPS != null && line != previousPSLine) {
      actualProgramStates.put(previousPSLine, previousPS);
    }

    previousPS = currentState;
    previousPSLine = line;
  }

  @Override
  public void endOfExecution(Scope functionScope) {
    if (previousPS != null) {
      actualProgramStates.put(previousPSLine, previousPS);
    }

    if (insideFunction) {
      this.endOfExecution = true;
    }
  }

  private class CommentParser extends SubscriptionVisitor {

    @Override
    public void visitFile(Tree scriptTree) {
      expectedProgramStates = new HashMap<>();
      expectedAbsentSymbols = HashMultimap.create();
    }

    @Override
    public Set<Kind> nodesToVisit() {
      return ImmutableSet.of(Kind.TOKEN);
    }

    @Override
    public void visitNode(Tree tree) {
      SyntaxToken token = (SyntaxToken) tree;

      for (SyntaxTrivia comment : token.trivias()) {
        String text = comment.text().substring(2).trim();
        if (!text.startsWith("PS")) {
          continue;
        }
        text = text.substring(2).trim();

        for (String oneProgramState : text.split("\\|\\|")) {
          oneProgramState = oneProgramState.trim();
          ProgramState ps = ProgramState.emptyState();

          for (String oneSymbolValue : oneProgramState.split("&")) {
            oneSymbolValue = oneSymbolValue.trim();
            if (!oneSymbolValue.startsWith("!")) {
              String[] pair = oneSymbolValue.split("\\s*=\\s*");
              Set<Symbol> symbols = getContext().getSymbolModel().getSymbols(pair[0]);
              if (symbols.size() > 1) {
                throw new AssertionError("For name '" + pair[0] + "' there is more than 1 symbol found.");
              }
              Symbol symbol = symbols.iterator().next();
              ps = ps.newSymbolicValue(symbol, parseSymbolicValue(pair[1]));

            } else {
              Symbol symbol = getContext().getSymbolModel().getSymbols(oneSymbolValue.substring(1)).iterator().next();
              expectedAbsentSymbols.put(comment.line(), symbol);

            }
          }

          if (!expectedProgramStates.containsKey(comment.line())) {
            expectedProgramStates.put(comment.line(), new HashMap<>());
          }
          Map<ProgramState, Boolean> expectedForTheLine = expectedProgramStates.get(comment.line());
          expectedForTheLine.put(ps, false);
        }
      }
    }


  }
}
