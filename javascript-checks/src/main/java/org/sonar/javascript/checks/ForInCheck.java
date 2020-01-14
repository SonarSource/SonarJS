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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "ForIn")
public class ForInCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Restrict what this loop acts on by testing each property.";

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    if (tree.is(Kind.FOR_IN_STATEMENT)) {
      StatementTree statementNode = tree.statement();

      if (statementNode.is(Kind.BLOCK)) {
        BlockTree block = (BlockTree) statementNode;
        statementNode = !block.statements().isEmpty() ? block.statements().get(0) : null;
      }

      if (statementNode != null && !statementNode.is(Kind.IF_STATEMENT) && !isAttrCopy(statementNode)) {
        addIssue(tree.forKeyword(), MESSAGE);
      }
    }

    super.visitForObjectStatement(tree);
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
