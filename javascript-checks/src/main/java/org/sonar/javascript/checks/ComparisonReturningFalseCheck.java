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
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

@Rule(key = "S3758")
public class ComparisonReturningFalseCheck extends SeCheck {

  private static final String MESSAGE = "Change this value so that the comparison does not consistently evaluate to \"false\".";

  /**
   * The operands for which an issue has already been raised.
   */
  private Set<ExpressionTree> operandsWithIssues = new HashSet<>();

  @Override
  public void startOfExecution(Scope functionScope) {
    operandsWithIssues.clear();
    super.startOfExecution(functionScope);
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(
      Tree.Kind.LESS_THAN,
      Tree.Kind.LESS_THAN_OR_EQUAL_TO,
      Tree.Kind.GREATER_THAN,
      Tree.Kind.GREATER_THAN_OR_EQUAL_TO
    )) {
      check(currentState, (BinaryExpressionTree) element);
    }
  }

  private void check(ProgramState state, BinaryExpressionTree element) {
    Constraint leftConstraint = state.getConstraint(state.peekStack(1));
    Constraint rightConstraint = state.getConstraint(state.peekStack(0));

    boolean leftIsObject = leftConstraint.isStricterOrEqualTo(Constraint.OBJECT); 
    boolean rightIsObject = rightConstraint.isStricterOrEqualTo(Constraint.OBJECT); 

    boolean leftIsUndefined = leftConstraint.isStricterOrEqualTo(Constraint.UNDEFINED); 
    boolean rightIsUndefined = rightConstraint.isStricterOrEqualTo(Constraint.UNDEFINED); 

    if (leftIsObject || rightIsObject) {
      if (!isSameObjectComparison(state, element) && !isTwoDates(leftConstraint, rightConstraint)) {
        raiseIssue(element, leftIsObject, rightIsObject);
      }
    } else if (leftIsUndefined || rightIsUndefined) {
      raiseIssue(element, leftIsUndefined, rightIsUndefined);
    }
  }

  /**
   * Returns true iff the expression is either <code>obj <= obj</code> or <code>obj >= obj</code>
   * (same object on the left and on the right).
   */
  private static boolean isSameObjectComparison(ProgramState state, BinaryExpressionTree element) {
    return element.is(Tree.Kind.LESS_THAN_OR_EQUAL_TO, Tree.Kind.GREATER_THAN_OR_EQUAL_TO)
      && state.peekStack(0).equals(state.peekStack(1));
  }

  /**
   * Returns true iff the left operand and the right operand are both a Date.
   */
  private static boolean isTwoDates(Constraint leftConstraint, Constraint rightConstraint) {
    return leftConstraint.isStricterOrEqualTo(Constraint.DATE)
        && rightConstraint.isStricterOrEqualTo(Constraint.DATE);
  }

  private void raiseIssue(BinaryExpressionTree comparison, boolean raiseIssueForLeft, boolean raiseIssueForRight) {
    if (raiseIssueForLeft) {
      raiseIssue(comparison.leftOperand());
    }
    if (raiseIssueForRight) {
      raiseIssue(comparison.rightOperand());
    }
  }

  /**
   * Raises an issue (but not twice for the same operand).
   */
  private void raiseIssue(ExpressionTree operand) {
    if (!operandsWithIssues.contains(operand)) {
      operandsWithIssues.add(operand);
      addIssue(operand, MESSAGE);
    }
  }

}
