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

import java.util.HashSet;
import java.util.Set;
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

  private static final String MESSAGE = "This expression might have a value which cannot be called; it is not a function.";

  private Set<CallExpressionTree> hasIssue;

  @Override
  public void startOfExecution(Scope functionScope) {
    hasIssue = new HashSet<>();
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTree callExpressionTree = (CallExpressionTree) element;

      SymbolicValue calleeSV = currentState.peekStack(callExpressionTree.arguments().parameters().size());
      Constraint constraint = currentState.getConstraint(calleeSV);

      if (constraint.isIncompatibleWith(Constraint.FUNCTION) && !hasIssue.contains(callExpressionTree)) {
        addIssue(callExpressionTree.callee(), MESSAGE);
        hasIssue.add(callExpressionTree);
      }
    }
  }
}
