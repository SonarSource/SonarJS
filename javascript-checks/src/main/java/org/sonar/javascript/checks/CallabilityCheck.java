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
package org.sonar.javascript.checks;

import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import org.sonar.check.Rule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;

@Rule(key = "S2873")
public class CallabilityCheck extends SeCheck {

  private static final String MESSAGE = "This expression has a value which cannot be called; it is not a function.";

  // For each call expression tree this map contains false if callee is non-callable in all execution paths, true if callee is callable in at least one execution path
  private Map<CallExpressionTree, Boolean> callability = new HashMap<>();


  @Override
  public void endOfExecution(Scope functionScope) {
    for (Entry<CallExpressionTree, Boolean> entry : callability.entrySet()) {
      if (!entry.getValue()) {
        addIssue(entry.getKey().callee(), MESSAGE);
      }
    }
  }

  @Override
  public void startOfExecution(Scope functionScope) {
    callability.clear();
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpression = (CallExpressionTree) element;
      SymbolicValue calleeSV = currentState.peekStack(callExpression.arguments().parameters().size());
      Constraint constraint = currentState.getConstraint(calleeSV);
      boolean isCallable = !constraint.isIncompatibleWith(Constraint.FUNCTION);

      if (isCallable) {
        callability.put(callExpression, true);

      } else if (!callability.containsKey(callExpression)) {
        callability.put(callExpression, false);
      }

    }
  }

}
