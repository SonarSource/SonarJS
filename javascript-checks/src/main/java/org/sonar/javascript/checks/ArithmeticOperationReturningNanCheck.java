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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

@Rule(key = "S3757")
public class ArithmeticOperationReturningNanCheck extends SeCheck {

  private static final String MESSAGE = "Change that expression so that it doesn't always evaluate to \"NaN\" (Not a Number).";

  private static final Constraint NUMBER_OR_BOOLEAN = Constraint.NUMBER.or(Constraint.BOOLEAN);
  private static final Constraint NUMBER_OR_BOOLEAN_OR_UNDEFINED = NUMBER_OR_BOOLEAN.or(Constraint.UNDEFINED);
  private static final Constraint NON_DATE_OBJECT = Constraint.OBJECT.and(Constraint.DATE.not());
  private static final Constraint UNDEFINED_OR_OBJECT = Constraint.UNDEFINED.or(Constraint.OBJECT);
  private static final Constraint UNDEFINED_OR_NON_DATE_OBJECT = Constraint.UNDEFINED.or(NON_DATE_OBJECT);

  private final BinaryOperationChecker plusChecker = new PlusChecker();
  private final BinaryOperationChecker minusChecker = new MinusChecker();
  private final BinaryOperationChecker otherBinaryOperationChecker = new OtherBinaryOperationChecker();

  private final Set<Tree> elementsWithIssues = new HashSet<>();

  @Override
  public void startOfExecution(Scope functionScope) {
    elementsWithIssues.clear();
    super.startOfExecution(functionScope);
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element) {
    if (element.is(Kind.PLUS, Kind.PLUS_ASSIGNMENT)) {

      checkBinaryOperation(currentState, element, plusChecker);

    } else if (element.is(Kind.MINUS, Kind.MINUS_ASSIGNMENT)) {

      checkBinaryOperation(currentState, element, minusChecker);

    } else if (element.is(
      Kind.MULTIPLY,
      Kind.DIVIDE,
      Kind.REMAINDER,
      Kind.MULTIPLY_ASSIGNMENT,
      Kind.DIVIDE_ASSIGNMENT,
      Kind.REMAINDER_ASSIGNMENT)) {

      checkBinaryOperation(currentState, element, otherBinaryOperationChecker);

    } else if (element.is(
      Kind.UNARY_PLUS,
      Kind.UNARY_MINUS,
      Kind.POSTFIX_INCREMENT,
      Kind.POSTFIX_DECREMENT,
      Kind.PREFIX_INCREMENT,
      Kind.PREFIX_DECREMENT)) {

      Constraint constraint = currentState.getConstraint(currentState.peekStack(0));
      if (constraint.isStricterOrEqualTo(UNDEFINED_OR_NON_DATE_OBJECT)) {
        raiseIssue(element);
      }
    }
  }

  private void raiseIssue(Tree element) {
    if (!elementsWithIssues.contains(element)) {
      addIssue(element, MESSAGE);
      elementsWithIssues.add(element);
    }
  }

  private static void checkBinaryOperation(ProgramState currentState, Tree element, BinaryOperationChecker checker) {
    Constraint rightConstraint = currentState.getConstraint(currentState.peekStack(0));
    Constraint leftConstraint = currentState.getConstraint(currentState.peekStack(1));
    checker.check(element, leftConstraint, rightConstraint);
  }

  @FunctionalInterface
  private interface BinaryOperationChecker {

    void check(Tree element, Constraint leftConstraint, Constraint rightConstraint);

  }

  private class PlusChecker implements BinaryOperationChecker {

    @Override
    public void check(Tree element, Constraint left, Constraint right) {
      if (isNumberAndUndefined(right, left) || isNumberAndUndefined(left, right)) {
        raiseIssue(element);
      }
    }

    private boolean isNumberAndUndefined(Constraint constraint1, Constraint constraint2) {
      return constraint1.isStricterOrEqualTo(NUMBER_OR_BOOLEAN_OR_UNDEFINED)
        && constraint2.isStricterOrEqualTo(Constraint.UNDEFINED);
    }

  }

  private class MinusChecker implements BinaryOperationChecker {
    @Override
    public void check(Tree element, Constraint left, Constraint right) {
      if (left.isStricterOrEqualTo(UNDEFINED_OR_NON_DATE_OBJECT) || right.isStricterOrEqualTo(UNDEFINED_OR_NON_DATE_OBJECT)) {
        raiseIssue(element);
      }
    }
  }

  private class OtherBinaryOperationChecker implements BinaryOperationChecker {
    @Override
    public void check(Tree element, Constraint left, Constraint right) {
      if (left.isStricterOrEqualTo(UNDEFINED_OR_OBJECT) || right.isStricterOrEqualTo(UNDEFINED_OR_OBJECT)) {
        raiseIssue(element);
      }
    }
  }

}
