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
package org.sonar.javascript.se.limitations;

import java.util.HashSet;
import java.util.Set;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.LogicalNotSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class CrossProceduralLimitation {

  public ProgramState prepareForBranching(Tree condition, ProgramState currentState) {
    if (conditionIsAmbiguous(currentState)) {
      return dropConstraintsOnSymbols(currentState, FunctionArgumentsCollector.collect(condition));
    } else {
      return currentState;
    }
  }

  private static ProgramState dropConstraintsOnSymbols(ProgramState incomingState, Set<Symbol> involvedSymbols) {
    ProgramState currentState = incomingState;
    for (Symbol symbol : involvedSymbols) {
      currentState = currentState.newSymbolicValue(symbol, Constraint.ANY_VALUE);
    }
    return currentState;
  }

  private static boolean conditionIsAmbiguous(ProgramState currentState) {
    final SymbolicValue value = currentState.peekStack();
    if (value instanceof LogicalNotSymbolicValue) {
      return currentState.getConstraint(((LogicalNotSymbolicValue) value).negatedValue()).equals(Constraint.ANY_VALUE);
    }
    return currentState.getConstraint(value).equals(Constraint.ANY_VALUE);
  }

  static class FunctionArgumentsCollector extends DoubleDispatchVisitor {

    private Set<Symbol> symbols = new HashSet<>();

    public static Set<Symbol> collect(Tree tree) {
      final FunctionArgumentsCollector collector = new FunctionArgumentsCollector();
      tree.accept(collector);
      collector.symbols.remove(null);
      return collector.symbols;
    }

    @Override
    public void visitCallExpression(CallExpressionTree tree) {
      for (Tree parameter : tree.argumentClause().arguments()) {
        if (parameter instanceof IdentifierTree) {
          ((IdentifierTree) parameter).symbol().ifPresent(symbols::add);
        }
      }
      super.visitCallExpression(tree);
    }
  }
}
