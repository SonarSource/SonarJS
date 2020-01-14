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

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.se.points.BinaryProgramPoint;
import org.sonar.javascript.se.points.ProgramPoint;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S3757")
public class ArithmeticOperationReturningNanCheck extends SeCheck {

  private static final String MESSAGE = "Change the expression which uses this operand so that it can't evaluate to \"NaN\" (Not a Number).";

  private static final Constraint NUMBER_LIKE_OBJECT = Constraint.NUMBER_OBJECT.or(Constraint.BOOLEAN_OBJECT).or(Constraint.DATE);
  private static final Constraint UNDEFINED_OR_NON_NUMBER_OBJECT = Constraint.UNDEFINED.or(Constraint.OBJECT.and(NUMBER_LIKE_OBJECT.not()));

  private final Set<Symbol> symbolsWithIssues = new HashSet<>();
  private final Set<Tree> operandsWithIssues = new HashSet<>();

  @Override
  public void startOfExecution(Scope functionScope) {
    symbolsWithIssues.clear();
    super.startOfExecution(functionScope);
  }

  @Override
  public void beforeBlockElement(ProgramState currentState, Tree element, ProgramPoint programPoint) {
    if (programPoint instanceof BinaryProgramPoint) {
      final BinaryProgramPoint binaryPoint = (BinaryProgramPoint) programPoint;
      final Constraint resultConstraint = binaryPoint.resultingConstraint(currentState);
      if (resultConstraint.isStricterOrEqualTo(Constraint.NAN)) {
        final ExpressionComponents components = new ExpressionComponents(element);
        if (binaryPoint.firstOperandConstraint().isStricterOrEqualTo(UNDEFINED_OR_NON_NUMBER_OBJECT)) {
          raiseIssue(components.leftOperand, components.operator, components.rightOperand);
        } else {
          raiseIssue(components.rightOperand, components.operator, components.leftOperand);
        }
      }

    } else if (element.is(
      Kind.UNARY_PLUS,
      Kind.UNARY_MINUS,
      Kind.POSTFIX_INCREMENT,
      Kind.POSTFIX_DECREMENT,
      Kind.PREFIX_INCREMENT,
      Kind.PREFIX_DECREMENT)) {

      Constraint constraint = currentState.getConstraint(currentState.peekStack(0));
      if (constraint.isStricterOrEqualTo(UNDEFINED_OR_NON_NUMBER_OBJECT)) {
        UnaryExpressionTree unaryExpression = (UnaryExpressionTree) element;
        raiseIssue(unaryExpression.expression(), unaryExpression.operatorToken());
      }
    }
  }

  private void raiseIssue(Tree operand, Tree... secondaryLocations) {
    Symbol operandSymbol = null;
    if (operand.is(Kind.IDENTIFIER_REFERENCE)) {
      IdentifierTree identifier = (IdentifierTree) operand;
      operandSymbol = identifier.symbol().orElse(null);
    }
    if (!symbolsWithIssues.contains(operandSymbol) && !operandsWithIssues.contains(operand)) {
      PreciseIssue issue = addIssue(operand, MESSAGE);
      Arrays.asList(secondaryLocations).forEach(issue::secondary);
      if (operandSymbol != null) {
        symbolsWithIssues.add(operandSymbol);
      }
      operandsWithIssues.add(operand);
    }
  }

  private static class ExpressionComponents {
    private ExpressionTree leftOperand;
    private ExpressionTree rightOperand;
    private Tree operator;

    public ExpressionComponents(Tree element) {
      if (element instanceof AssignmentExpressionTree) {
        AssignmentExpressionTree assignment = (AssignmentExpressionTree) element;
        leftOperand = assignment.variable();
        rightOperand = assignment.expression();
        operator = assignment.operatorToken();
      } else {
        BinaryExpressionTree binaryExpression = (BinaryExpressionTree) element;
        leftOperand = binaryExpression.leftOperand();
        rightOperand = binaryExpression.rightOperand();
        operator = binaryExpression.operatorToken();
      }
    }

  }
}
