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
package org.sonar.javascript.checks;

import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

@JavaScriptRule
@Rule(key = "S3758")
public class ValuesNotConvertibleToNumbersCheck extends AbstractAnyPathSeCheck {

  private static final String MESSAGE = "Re-evaluate the data flow; this operand of a numeric comparison could be %s.";

  private static final Constraint CONVERTIBLE_TO_NUMBER = Constraint.ANY_NUMBER.or(Constraint.ANY_BOOLEAN).or(Constraint.DATE).or(Constraint.NULL);

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
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
    final Constraint leftConstraint = state.getConstraint(state.peekStack(1));
    final Constraint rightConstraint = state.getConstraint(state.peekStack(0));

    final boolean leftIsUndefined = leftConstraint.isStricterOrEqualTo(Constraint.UNDEFINED);
    final boolean rightIsUndefined = rightConstraint.isStricterOrEqualTo(Constraint.UNDEFINED);
    final boolean leftIsNan = leftConstraint.isStricterOrEqualTo(Constraint.NAN);
    final boolean rightIsNan = rightConstraint.isStricterOrEqualTo(Constraint.NAN);

    if (checkObjectIsComparedNumerically(leftConstraint, rightConstraint)) {
      raiseIssue(element, true, false, "an Object");
    } else if (checkObjectIsComparedNumerically(rightConstraint, leftConstraint)) {
      raiseIssue(element, false, true, "an Object");
    } else if (leftIsUndefined || rightIsUndefined) {
      raiseIssue(element, leftIsUndefined, rightIsUndefined, "\"undefined\"");
    } else if (leftIsNan || rightIsNan) {
      raiseIssue(element, leftIsNan, rightIsNan, "NaN");
    }
  }
  
  private static boolean checkObjectIsComparedNumerically(Constraint constraint1, Constraint constraint2) {
    return isObjectNotConvertibleToNumber(constraint1)
      && isConvertibleToNumber(constraint2);
  }
  
  private static boolean isObjectNotConvertibleToNumber(Constraint c) {
    return c.isStricterOrEqualTo(Constraint.OBJECT) 
       && !c.isStricterOrEqualTo(Constraint.BOOLEAN_OBJECT)
       && !c.isStricterOrEqualTo(Constraint.NUMBER_OBJECT)
       && !c.isStricterOrEqualTo(Constraint.DATE);
  }
  
  private static boolean isConvertibleToNumber(Constraint c) {
    return c.isStricterOrEqualTo(CONVERTIBLE_TO_NUMBER);
  }
  
  private void raiseIssue(
    BinaryExpressionTree comparison,
    boolean raiseIssueForLeft,
    boolean raiseIssueForRight,
    String messageParam
  ) {
    if (raiseIssueForLeft) {
      raiseIssue(comparison.leftOperand(), messageParam);
    }
    if (raiseIssueForRight) {
      raiseIssue(comparison.rightOperand(), messageParam);
    }
  }

  private void raiseIssue(ExpressionTree operand, String messageParam) {
    addUniqueIssue(operand, String.format(MESSAGE, messageParam));
  }

}
