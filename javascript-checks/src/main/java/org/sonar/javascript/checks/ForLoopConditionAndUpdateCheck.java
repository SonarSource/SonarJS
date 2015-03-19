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

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.SyntacticEquivalence;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.base.Joiner;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;

@Rule(
  key = "S1994",
  name = "\"for\" loop incrementers should modify the variable being tested in the loop's stop condition",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("20min")
public class ForLoopConditionAndUpdateCheck extends BaseTreeVisitor {

  @Override
  public void visitForStatement(ForStatementTree forStatement) {
    List<ExpressionTree> updatedExpressions = updatedExpressions(forStatement.update());
    ExpressionTree condition = forStatement.condition();
    if (!updatedExpressions.isEmpty() && condition != null) {
      ConditionVisitor conditionVisitor = new ConditionVisitor(updatedExpressions);
      condition.accept(conditionVisitor);
      if (!conditionVisitor.foundUpdatedExpression) {
        String updated = expressionList(updatedExpressions);
        String tested = expressionList(conditionVisitor.testedExpressions);
        String message = String.format("This loop's stop condition tests \"%s\" but the incrementer updates \"%s\".", tested, updated);
        getContext().addIssue(this, forStatement, message);
      }
    }
    super.visitForStatement(forStatement);
  }

  private String expressionList(List<ExpressionTree> expressions) {
    List<String> names = Lists.newArrayList();
    for (ExpressionTree expression : expressions) {
      names.add(CheckUtils.asString(expression));
    }
    return Joiner.on(", ").join(names);
  }

  private static IdentifierTree callee(CallExpressionTree tree) {
    ExpressionTree callee = tree.callee();
    while (callee.is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      callee = ((MemberExpressionTree) callee).object();
    }
    if (callee.is(Tree.Kind.IDENTIFIER_REFERENCE) && !callee.equals(tree.callee())) {
      return (IdentifierTree) callee;
    }
    return null;
  }

  private List<ExpressionTree> updatedExpressions(ExpressionTree expression) {
    if (expression == null) {
      return ImmutableList.<ExpressionTree>of();
    }

    UpdateVisitor visitor = new UpdateVisitor();
    expression.accept(visitor);
    return visitor.updatedExpressions;
  }

  private static class UpdateVisitor extends BaseTreeVisitor {

    private final List<ExpressionTree> updatedExpressions = Lists.newArrayList();

    @Override
    public void visitAssignmentExpression(AssignmentExpressionTree tree) {
      updatedExpressions.add(tree.variable());
      super.visitAssignmentExpression(tree);
    }

    @Override
    public void visitUnaryExpression(UnaryExpressionTree tree) {
      if (tree.is(Tree.Kind.POSTFIX_INCREMENT, Tree.Kind.POSTFIX_DECREMENT, Tree.Kind.PREFIX_INCREMENT, Tree.Kind.PREFIX_DECREMENT)) {
        updatedExpressions.add(tree.expression());
      }
      super.visitUnaryExpression(tree);
    }

    @Override
    public void visitCallExpression(CallExpressionTree tree) {
      IdentifierTree callee = callee(tree);
      if (callee != null) {
        updatedExpressions.add(callee);
      }
      super.visitCallExpression(tree);
    }

  }

  private static class ConditionVisitor extends BaseTreeVisitor {

    private List<ExpressionTree> updatedExpressions;
    private List<ExpressionTree> testedExpressions = Lists.newArrayList();
    private Deque<MemberExpressionTree> memberExpressions = new ArrayDeque<>();
    private boolean foundUpdatedExpression = false;

    public ConditionVisitor(List<ExpressionTree> updatedExpressions) {
      this.updatedExpressions = updatedExpressions;
    }

    @Override
    public void visitIdentifier(IdentifierTree tree) {
      checkForUpdate(tree);
    }

    @Override
    public void visitMemberExpression(MemberExpressionTree tree) {
      checkForUpdate(tree);
      memberExpressions.push(tree);
      super.visitMemberExpression(tree);
      memberExpressions.pop();
    }

    @Override
    public void visitCallExpression(CallExpressionTree tree) {
      IdentifierTree callee = callee(tree);
      if (callee != null) {
        checkForUpdate(callee);
      } else {
        logTestedExpression(tree.callee());
      }
      scan(tree.arguments());
    }

    private void checkForUpdate(ExpressionTree tree) {
      logTestedExpression(tree);
      for (ExpressionTree updatedExpression : updatedExpressions) {
        if (SyntacticEquivalence.areEquivalent(updatedExpression, tree)) {
          foundUpdatedExpression = true;
        }
      }
    }

    private void logTestedExpression(ExpressionTree tree) {
      if (memberExpressions.isEmpty()) {
        testedExpressions.add(tree);
      }
    }

  }

}
