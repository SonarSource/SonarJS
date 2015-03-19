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

import javax.annotation.Nullable;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.declaration.InitializedBindingElementTree;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.AssignmentExpressionTree;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ParenthesisedExpressionTree;
import org.sonar.javascript.model.interfaces.statement.DoWhileStatementTree;
import org.sonar.javascript.model.interfaces.statement.ExpressionStatementTree;
import org.sonar.javascript.model.interfaces.statement.ForStatementTree;
import org.sonar.javascript.model.interfaces.statement.WhileStatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "AssignmentWithinCondition",
  name = "Assignments should not be made from within sub-expressions",
  priority = Priority.MAJOR,
  tags = {Tags.BUG, Tags.CWE, Tags.MISRA})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("10min")
public class AssignmentWithinConditionCheck extends BaseTreeVisitor {

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    // Exception: skip assignment in while statement
    scan(tree.statement());
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    // Exception: skip assignment in do while statement
    scan(tree.statement());
  }

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    scan(tree.left());
    visitInitialisationExpression(tree.right());

  }

  private void visitInitialisationExpression(ExpressionTree left) {
    if (left instanceof AssignmentExpressionTree) {
      scan(((AssignmentExpressionTree) left).variable());
      visitInitialisationExpression(((AssignmentExpressionTree) left).expression());

    } else {
      scan(left);
    }
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    visitCommaOperatorExpression(tree.init());
    scan(tree.condition());
    scan(tree.statement());
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree lambdaExpressionTree) {
    // skip arrow function if body is an assignement
    if (!(lambdaExpressionTree.conciseBody() instanceof AssignmentExpressionTree)) {
      super.visitArrowFunction(lambdaExpressionTree);
    }
  }

  @Override
  public void visitExpressionStatement(ExpressionStatementTree tree) {
    Tree expressionTree = tree.expression();

    if (expressionTree.is(Kind.COMMA_OPERATOR)) {
      visitCommaOperatorExpression(((BinaryExpressionTree) expressionTree).leftOperand());
      visitCommaOperatorExpression(((BinaryExpressionTree) expressionTree).rightOperand());

    } else {
      while (expressionTree instanceof AssignmentExpressionTree) {
        AssignmentExpressionTree assignmentExpressionTree = (AssignmentExpressionTree) expressionTree;
        scan(assignmentExpressionTree.variable());
        expressionTree = assignmentExpressionTree.expression();
      }

      scan(expressionTree);
    }
  }

  public void visitCommaOperatorExpression(Tree expression) {
    if (expression == null) {
      return;
    }

    if (expression.is(Kind.COMMA_OPERATOR)) {
      visitCommaOperatorExpression(((BinaryExpressionTree) expression).leftOperand());
      visitCommaOperatorExpression(((BinaryExpressionTree) expression).rightOperand());

    } else if (expression instanceof AssignmentExpressionTree) {
      super.visitAssignmentExpression((AssignmentExpressionTree) expression);

    } else {
      scan(expression);
    }
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (isRelationalExpression(tree)) {
      visitInnerExpression(tree.leftOperand());
      visitInnerExpression(tree.rightOperand());
    } else {
      super.visitBinaryExpression(tree);
    }
  }

  private void visitInnerExpression(ExpressionTree tree) {
    AssignmentExpressionTree assignmentExpressionTree = getInnerAssignmentExpression(tree);
    if (assignmentExpressionTree != null) {
      super.visitAssignmentExpression(assignmentExpressionTree);
    } else {
      scan(tree);
    }
  }

  @Nullable
  private static AssignmentExpressionTree getInnerAssignmentExpression(ExpressionTree tree) {
    if (tree.is(Kind.PARENTHESISED_EXPRESSION)) {
      ParenthesisedExpressionTree parenthesizedTree = (ParenthesisedExpressionTree) tree;

      if (parenthesizedTree.expression() instanceof AssignmentExpressionTree) {
        return (AssignmentExpressionTree) parenthesizedTree.expression();
      }
    }
    return null;
  }

  private static boolean isRelationalExpression(Tree tree) {
    return tree.is(Kind.EQUAL_TO) ||
      tree.is(Kind.STRICT_EQUAL_TO) ||
      tree.is(Kind.NOT_EQUAL_TO) ||
      tree.is(Kind.STRICT_NOT_EQUAL_TO) ||
      tree.is(Kind.LESS_THAN) ||
      tree.is(Kind.LESS_THAN_OR_EQUAL_TO) ||
      tree.is(Kind.GREATER_THAN) ||
      tree.is(Kind.GREATER_THAN_OR_EQUAL_TO) ||
      tree.is(Kind.RELATIONAL_IN);
  }

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    super.visitAssignmentExpression(tree);

    getContext().addIssue(this, tree, "Extract the assignment out of this expression.");
  }
}
