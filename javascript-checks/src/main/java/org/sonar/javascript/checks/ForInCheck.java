/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "ForIn",
  name = "\"for...in\" loops should filter properties before acting on them",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5min")
public class ForInCheck extends BaseTreeVisitor {

  @Override
  public void visitForInStatement(ForInStatementTree tree) {
    StatementTree statementNode = tree.statement();

    if (statementNode.is(Kind.BLOCK)) {
      BlockTree block = (BlockTree) statementNode;
      statementNode = !block.statements().isEmpty() ? block.statements().get(0) : null;
    }

    if (statementNode != null && !statementNode.is(Kind.IF_STATEMENT) && !isAttrCopy(statementNode)) {
      getContext().addIssue(this, tree, "Insert an if statement at the beginning of this loop to filter items.");
    }

    super.visitForInStatement(tree);
  }

  private static boolean isAttrCopy(StatementTree statement) {
    if (statement.is(Kind.EXPRESSION_STATEMENT)) {
      Tree expression = ((ExpressionStatementTree) statement).expression();
      if (expression.is(Kind.ASSIGNMENT)) {
        AssignmentExpressionTree assignment = (AssignmentExpressionTree) expression;
        return assignment.variable().is(Kind.BRACKET_MEMBER_EXPRESSION);
      }
    }

    return false;
  }

}
