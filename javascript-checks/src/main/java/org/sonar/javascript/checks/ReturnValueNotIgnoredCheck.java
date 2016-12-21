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
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.expression.CallExpressionTreeImpl;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

@Rule(key = "S2201")
public class ReturnValueNotIgnoredCheck extends SeCheck {

  private static final String MESSAGE = "The return value of \"%s\" must be used.";

  /**
   * Used to avoid multiple identical issues due to different execution paths.
   */
  private Set<CallExpressionTree> expressionsWithIssue = new HashSet<>();

  @Override
  public void startOfExecution(Scope functionScope) {
    expressionsWithIssue.clear();
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(Kind.CALL_EXPRESSION)) {
      CallExpressionTreeImpl callExpression = (CallExpressionTreeImpl) element;
      Tree parent = callExpression.getParent();
      if (parent.is(Kind.EXPRESSION_STATEMENT) && isExemptFromSideEffects(callExpression, currentState) && !issueAlreadyReported(callExpression)) {
        String message = String.format(MESSAGE, getCalleeName(callExpression));
        addIssue(callExpression, message);
        expressionsWithIssue.add(callExpression);
      }
    }
  }

  /**
   * Returns true if the specified call has no side effects.
   * Returns false if the specified call has or may have side effects. 
   */
  private static boolean isExemptFromSideEffects(CallExpressionTree callExpression, ProgramState state) {
    SeparatedList<Tree> arguments = callExpression.arguments().parameters();
    SymbolicValue calleeValue = state.peekStack(arguments.size());
    if (calleeValue instanceof BuiltInFunctionSymbolicValue) {
      BuiltInFunctionSymbolicValue builtInFunction = (BuiltInFunctionSymbolicValue) calleeValue;
      return !builtInFunction.hasSideEffect();
    }
    return false;
  }

  private static String getCalleeName(CallExpressionTree callExpression) {
    ExpressionTree callee = CheckUtils.removeParenthesis(callExpression.callee()); 
    if (callee.is(Kind.DOT_MEMBER_EXPRESSION)) {
      return ((DotMemberExpressionTree)callee).property().name();
    } else {
      return CheckUtils.asString(callee);
    }
  }

  private boolean issueAlreadyReported(CallExpressionTree callExpression) {
    return expressionsWithIssue.contains(callExpression);
  }

}
