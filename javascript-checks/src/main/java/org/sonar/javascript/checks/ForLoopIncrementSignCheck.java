/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import javax.annotation.CheckForNull;
import javax.annotation.Nullable;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.SyntacticEquivalence;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.AssignmentExpressionTree;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;
import org.sonar.javascript.model.interfaces.statement.ForStatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.base.Preconditions;

@Rule(
  key = "S2251",
  name = "A \"for\" loop update clause should move the counter in the right direction",
  priority = Priority.BLOCKER,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("5min")
public class ForLoopIncrementSignCheck extends BaseTreeVisitor {

  @Override
  public void visitForStatement(ForStatementTree forStatement) {
    ExpressionTree condition = forStatement.condition();
    ForLoopIncrement loopIncrement = ForLoopIncrement.findInLoopUpdate(forStatement);
    if (condition == null || loopIncrement == null || !loopIncrement.hasValue()) {
      return;
    }
    checkIncrementSign(condition, loopIncrement);
    super.visitForStatement(forStatement);
  }

  private void checkIncrementSign(ExpressionTree condition, ForLoopIncrement loopIncrement) {
    if (condition.is(Tree.Kind.GREATER_THAN, Tree.Kind.GREATER_THAN_OR_EQUAL_TO)) {
      BinaryExpressionTree binaryExp = (BinaryExpressionTree) condition;
      if (loopIncrement.hasSameIdentifier(binaryExp.leftOperand())) {
        checkNegativeIncrement(condition, loopIncrement);
      } else if (loopIncrement.hasSameIdentifier(binaryExp.rightOperand())) {
        checkPositiveIncrement(condition, loopIncrement);
      }
    } else if (condition.is(Tree.Kind.LESS_THAN, Tree.Kind.LESS_THAN_OR_EQUAL_TO)) {
      BinaryExpressionTree binaryExp = (BinaryExpressionTree) condition;
      if (loopIncrement.hasSameIdentifier(binaryExp.leftOperand())) {
        checkPositiveIncrement(condition, loopIncrement);
      } else if (loopIncrement.hasSameIdentifier(binaryExp.rightOperand())) {
        checkNegativeIncrement(condition, loopIncrement);
      }
    }
  }

  private void checkPositiveIncrement(Tree tree, ForLoopIncrement loopIncrement) {
    if (loopIncrement.value() < 0) {
      addIssue(tree, loopIncrement, "decremented");
    }
  }

  private void checkNegativeIncrement(Tree tree, ForLoopIncrement loopIncrement) {
    if (loopIncrement.value() > 0) {
      addIssue(tree, loopIncrement, "incremented");
    }
  }

  private void addIssue(Tree tree, ForLoopIncrement loopIncrement, String adjective) {
    String identifier = loopIncrement.identifier.name();
    String message = String.format("\"%s\" is %s and will never reach \"stop condition\".", identifier, adjective);
    getContext().addIssue(this, tree, message);
  }

  private static class ForLoopIncrement {

    private final IdentifierTree identifier;
    private final Double value;

    public ForLoopIncrement(IdentifierTree identifier, @Nullable Double value) {
      this.identifier = identifier;
      this.value = value;
    }

    public boolean hasSameIdentifier(ExpressionTree expression) {
      return SyntacticEquivalence.areEquivalent(identifier, expression);
    }

    public boolean hasValue() {
      return value != null;
    }

    public double value() {
      Preconditions.checkState(value != null, "This ForLoopIncrement has no value");
      return value;
    }

    @CheckForNull
    public static ForLoopIncrement findInLoopUpdate(ForStatementTree forStatement) {
      ForLoopIncrement result = null;
      ExpressionTree expression = forStatement.update();
      if (expression != null) {
        if (expression.is(Tree.Kind.POSTFIX_INCREMENT, Tree.Kind.PREFIX_INCREMENT)) {
          UnaryExpressionTree unaryExp = (UnaryExpressionTree) expression;
          result = increment(unaryExp.expression(), 1.);
        } else if (expression.is(Tree.Kind.POSTFIX_DECREMENT, Tree.Kind.PREFIX_DECREMENT)) {
          UnaryExpressionTree unaryExp = (UnaryExpressionTree) expression;
          result = increment(unaryExp.expression(), -1.);
        } else if (expression.is(Tree.Kind.PLUS_ASSIGNMENT)) {
          AssignmentExpressionTree assignmentExp = (AssignmentExpressionTree) expression;
          result = increment(assignmentExp.variable(), numericValue(assignmentExp.expression()));
        } else if (expression.is(Tree.Kind.MINUS_ASSIGNMENT)) {
          AssignmentExpressionTree assignmentExp = (AssignmentExpressionTree) expression;
          result = increment(assignmentExp.variable(), minus(numericValue(assignmentExp.expression())));
        } else if (expression.is(Tree.Kind.ASSIGNMENT)) {
          AssignmentExpressionTree assignment = (AssignmentExpressionTree) expression;
          result = assignmentIncrement(assignment);
        }
      }
      return result;
    }

    @CheckForNull
    private static ForLoopIncrement increment(ExpressionTree expression, Double value) {
      if (expression.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
        return new ForLoopIncrement((IdentifierTree) expression, value);
      }
      return null;
    }

    private static ForLoopIncrement assignmentIncrement(AssignmentExpressionTree assignmentExpression) {
      ExpressionTree expression = assignmentExpression.expression();
      ExpressionTree variable = assignmentExpression.variable();
      if (variable.is(Tree.Kind.IDENTIFIER_REFERENCE) && expression.is(Tree.Kind.PLUS, Tree.Kind.MINUS)) {
        BinaryExpressionTree binaryExp = (BinaryExpressionTree) expression;
        Double increment = numericValue(binaryExp.rightOperand());
        if (increment != null && SyntacticEquivalence.areEquivalent(variable, binaryExp.leftOperand())) {
          increment = expression.is(Tree.Kind.MINUS) ? minus(increment) : increment;
          return increment(variable, increment);
        }
        return new ForLoopIncrement((IdentifierTree) variable, null);
      }
      return null;
    }
  }

  @CheckForNull
  private static Double minus(@Nullable Double nullableNumeric) {
    return nullableNumeric == null ? null : -nullableNumeric;
  }

  @CheckForNull
  public static Double numericValue(ExpressionTree expression) {
    if (expression.is(Tree.Kind.NUMERIC_LITERAL)) {
      return Double.valueOf(((LiteralTree) expression).value());
    }
    if (expression.is(Tree.Kind.UNARY_MINUS, Tree.Kind.UNARY_PLUS)) {
      UnaryExpressionTree unaryExp = (UnaryExpressionTree) expression;
      Double subExpressionIntValue = numericValue(unaryExp.expression());
      return expression.is(Tree.Kind.UNARY_MINUS) ? minus(subExpressionIntValue) : subExpressionIntValue;
    }
    return null;
  }

}
