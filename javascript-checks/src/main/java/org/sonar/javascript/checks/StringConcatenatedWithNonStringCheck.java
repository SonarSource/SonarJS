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

import javax.annotation.CheckForNull;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

@JavaScriptRule
@Rule(key = "S3402")
public class StringConcatenatedWithNonStringCheck extends AbstractAllPathSeCheck<BinaryExpressionTree> {

  private static final String MESSAGE = "Either make this concatenation explicit or cast one operand to a number.";

  @Override
  BinaryExpressionTree getTree(Tree element) {
    if (element.is(Kind.PLUS)) {
      return (BinaryExpressionTree) element;
    }
    return null;
  }

  @Override
  boolean isProblem(BinaryExpressionTree tree, ProgramState currentState) {
    ExpressionTree onlyStringOperand = getOnlyStringOperand(tree.leftOperand(), tree.rightOperand(), currentState);
    return onlyStringOperand != null && onlyStringOperand.is(Kind.IDENTIFIER_REFERENCE);
  }

  @Override
  void raiseIssue(BinaryExpressionTree tree) {
    addIssue(tree.operatorToken(), MESSAGE)
      .secondary(tree.leftOperand())
      .secondary(tree.rightOperand());
  }

  @CheckForNull
  private static ExpressionTree getOnlyStringOperand(ExpressionTree leftOperand, ExpressionTree rightOperand, ProgramState currentState) {
    Constraint rightConstraint = currentState.getConstraint(currentState.peekStack(0));
    Constraint leftConstraint = currentState.getConstraint(currentState.peekStack(1));

    Type rightType = rightConstraint.type();
    Type leftType = leftConstraint.type();


    if (leftType != null && rightType != null) {

      if (leftConstraint.isStricterOrEqualTo(Constraint.ANY_STRING) && !rightConstraint.isStricterOrEqualTo(Constraint.ANY_STRING)) {
        return leftOperand;

      } else if (!leftConstraint.isStricterOrEqualTo(Constraint.ANY_STRING) && rightConstraint.isStricterOrEqualTo(Constraint.ANY_STRING)) {
        return rightOperand;
      }
    }

    return null;
  }

}
