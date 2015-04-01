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
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.BindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.InitializedBindingElementTree;
import org.sonar.javascript.model.interfaces.expression.AssignmentExpressionTree;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.javascript.model.interfaces.statement.ForStatementTree;
import org.sonar.javascript.model.interfaces.statement.VariableDeclarationTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
    key = "S888",
    name = "Relational operators should be used in \"for\" loop termination conditions",
    priority = Priority.CRITICAL,
    tags = {Tags.BUG, Tags.CERT, Tags.CWE, Tags.MISRA})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("2min")
public class EqualInForLoopTerminationCheck extends BaseTreeVisitor {

  @Override
  public void visitForStatement(ForStatementTree tree) {
    ExpressionTree condition = tree.condition();
    ExpressionTree update = tree.update();

    boolean conditionCondition = condition != null && isEquality(condition);
    boolean updateCondition = update != null && isUpdateIncDec(update);

    if (conditionCondition && updateCondition && (condition.is(Tree.Kind.EQUAL_TO) || !isException(tree))) {
      addIssue(condition);
    }

    super.visitForStatement(tree);
  }

  private void addIssue(ExpressionTree condition) {
    String message = String.format("Replace '%s' operator with one of '<=', '>=', '<', or '>' comparison operators.", ((BinaryExpressionTree) condition).operator().text());
    getContext().addIssue(this, condition, message);
  }

  private boolean isEquality(ExpressionTree condition) {
    return condition.is(Tree.Kind.EQUAL_TO, Tree.Kind.NOT_EQUAL_TO);
  }

  private boolean isException(ForStatementTree forStatement) {
    // todo(Lena): consider usage of counter inside the loop. Do it with symbol table.
    Tree init = forStatement.init();
    ExpressionTree condition = forStatement.condition();
    ExpressionTree update = forStatement.update();

    if (init != null && condition != null && update != null) {
      int updateByOne = checkForUpdateByOne(update);
      if (condition.is(Tree.Kind.NOT_EQUAL_TO) && updateByOne != 0) {
        Integer endValue = getValue(condition);
        Integer beginValue = getValue(init);
        if (endValue != null && beginValue != null && updateByOne == Integer.signum(endValue - beginValue)) {
          return true;
        }
      }
    }
    return false;
  }

  private Integer getValue(Tree tree) {
    Integer result = null;
    if (tree.is(Tree.Kind.NOT_EQUAL_TO)) {
      result = getInteger(((BinaryExpressionTree) tree).rightOperand());
    } else if (isOneVarDeclaration(tree)) {
      BindingElementTree variable = ((VariableDeclarationTree) tree).variables().get(0);
      if (variable.is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
        result = getInteger(((InitializedBindingElementTree)variable).right());
      }
    } else if (tree.is(Tree.Kind.ASSIGNMENT)) {
      result = getInteger(((AssignmentExpressionTree)tree).expression());
    }
    return result;
  }

  private boolean isOneVarDeclaration(Tree tree) {
    return tree.is(Tree.Kind.VAR_DECLARATION) && ((VariableDeclarationTree) tree).variables().size() == 1;
  }

  private Integer getInteger(ExpressionTree expression) {
    if (expression.is(Tree.Kind.NUMERIC_LITERAL)) {
      LiteralTree literal = (LiteralTree) expression;
      Integer decoded;
      try {
        decoded = Integer.decode(literal.value());
        return decoded;
      } catch (NumberFormatException e) {
        return null;
      }
    }
    return null;
  }

  private int checkForUpdateByOne(ExpressionTree update) {
    if (update.is(Tree.Kind.POSTFIX_INCREMENT, Tree.Kind.PREFIX_INCREMENT) || (update.is(Tree.Kind.PLUS_ASSIGNMENT) && isUpdateOnOneWithAssign(update))) {
      return +1;
    }
    if (update.is(Tree.Kind.POSTFIX_DECREMENT, Tree.Kind.PREFIX_DECREMENT) || (update.is(Tree.Kind.MINUS_ASSIGNMENT) && isUpdateOnOneWithAssign(update))) {
      return -1;
    }
    return 0;
  }

  private boolean isUpdateIncDec(ExpressionTree update) {
    boolean result = false;
    if (update.is(Tree.Kind.COMMA_OPERATOR)){
      BinaryExpressionTree commaExpressions = (BinaryExpressionTree)update;
      result = isUpdateIncDec(commaExpressions.leftOperand()) && isUpdateIncDec(commaExpressions.rightOperand());
    } else if (update.is(Tree.Kind.POSTFIX_INCREMENT, Tree.Kind.PREFIX_INCREMENT) || update.is(Tree.Kind.PLUS_ASSIGNMENT)) {
      result = true;
    } else if (update.is(Tree.Kind.POSTFIX_DECREMENT, Tree.Kind.PREFIX_DECREMENT) || update.is(Tree.Kind.MINUS_ASSIGNMENT)) {
      result = true;
    }
    return result;
  }

  private boolean isUpdateOnOneWithAssign(ExpressionTree update) {
    if (update.is(Tree.Kind.PLUS_ASSIGNMENT, Tree.Kind.MINUS_ASSIGNMENT)) {
      ExpressionTree rightExpression = ((AssignmentExpressionTree) update).expression();
      return rightExpression.is(Tree.Kind.NUMERIC_LITERAL) && ((LiteralTree) rightExpression).value().equals("1");
    }
    return false;
  }
}
