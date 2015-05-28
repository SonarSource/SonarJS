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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S1125",
  name = "Literal boolean values should not be used in condition expressions",
  priority = Priority.MINOR,
  tags = {Tags.CLUMSY})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("2min")
public class BooleanEqualityComparisonCheck extends BaseTreeVisitor {

  private static final Kind[] BINARY_OPERATORS = {
      Kind.CONDITIONAL_AND,
      Kind.CONDITIONAL_OR,
      Kind.EQUAL_TO,
      Kind.NOT_EQUAL_TO
  };

  private boolean isBooleanExpression(ExpressionTree expressionTree) {
    final boolean isBoolean;
    if (expressionTree.is(Kind.PARENTHESISED_EXPRESSION)) {
      ParenthesisedExpressionTree parenthesisedExpressionTree = (ParenthesisedExpressionTree)expressionTree;
      isBoolean = isBooleanExpression(parenthesisedExpressionTree.expression());
    } else if (expressionTree.is(Kind.CONDITIONAL_EXPRESSION)) {
      ConditionalExpressionTree conditionalExpressionTree = (ConditionalExpressionTree)expressionTree;
      isBoolean = isBooleanExpression(conditionalExpressionTree.trueExpression())
              && isBooleanExpression(conditionalExpressionTree.falseExpression());
    } else {
      isBoolean = expressionTree.is(Kind.BOOLEAN_LITERAL)
          || expressionTree.is(Kind.LOGICAL_COMPLEMENT)
          || expressionTree.is(BINARY_OPERATORS);
    }
    return isBoolean;
  }

  @Override
  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    if (isBooleanExpression(tree.condition())) {
      visitExpression(tree.condition());
    }
    if (isBooleanExpression(tree.trueExpression()) && isBooleanExpression(tree.falseExpression())) {
      visitExpression(tree.trueExpression());
      visitExpression(tree.falseExpression());
    }
    super.visitConditionalExpression(tree);
  }


  
  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (isBooleanExpression(tree)) {
      visitExpression(tree.expression());
    }
    super.visitUnaryExpression(tree);
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (isBooleanExpression(tree)) {
      visitExpression(tree.leftOperand());
      visitExpression(tree.rightOperand());
    }
    super.visitBinaryExpression(tree);
  }

  private void visitExpression(ExpressionTree expression) {
    if (expression.is(Kind.PARENTHESISED_EXPRESSION)) {
      ParenthesisedExpressionTree parenthesisExpressionTree = (ParenthesisedExpressionTree)expression;
      visitExpression(parenthesisExpressionTree.expression());
    } else if (expression.is(Kind.BOOLEAN_LITERAL)){
      String message = String.format("Remove the literal \"%s\" boolean value.", ((LiteralTree) expression).value());
      getContext().addIssue(this, expression, message);
    }
  }

}
