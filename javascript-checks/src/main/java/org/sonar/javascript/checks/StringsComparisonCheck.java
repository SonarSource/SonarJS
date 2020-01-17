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
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

@JavaScriptRule
@Rule(key = "S3003")
public class StringsComparisonCheck extends AbstractAllPathSeCheck<BinaryExpressionTree> {

  private static final String MESSAGE = "Convert operands of this use of \"%s\" to number type.";

  private static final Kind[] RELATIVE_OPERATIONS = {
    Kind.LESS_THAN,
    Kind.LESS_THAN_OR_EQUAL_TO,
    Kind.GREATER_THAN,
    Kind.GREATER_THAN_OR_EQUAL_TO
  };

  @Override
  BinaryExpressionTree getTree(Tree element) {
    if (element.is(RELATIVE_OPERATIONS)) {
      return (BinaryExpressionTree) element;
    }
    return null;
  }

  @Override
  boolean isProblem(BinaryExpressionTree tree, ProgramState currentState) {
    Constraint rightConstraint = currentState.getConstraint(currentState.peekStack(0));
    Constraint leftConstraint = currentState.getConstraint(currentState.peekStack(1));

    return rightConstraint.isStricterOrEqualTo(Constraint.ANY_STRING) && leftConstraint.isStricterOrEqualTo(Constraint.ANY_STRING);
  }

  @Override
  void raiseIssue(BinaryExpressionTree tree) {
    if (!hasOneSymbolLiteralOperand(tree)) {
      String message = String.format(MESSAGE, tree.operatorToken().text());

      addIssue(tree.operatorToken(), message)
        .secondary(tree.leftOperand())
        .secondary(tree.rightOperand());
    }
  }

  private static boolean hasOneSymbolLiteralOperand(BinaryExpressionTree expression) {
    LiteralTree literal =  null;
    if (expression.leftOperand().is(Kind.STRING_LITERAL)) {
      literal = (LiteralTree) expression.leftOperand();

    } else if (expression.rightOperand().is(Kind.STRING_LITERAL)) {
      literal = (LiteralTree) expression.rightOperand();
    }

    return literal != null && literal.value().length() == 3;
  }
}
