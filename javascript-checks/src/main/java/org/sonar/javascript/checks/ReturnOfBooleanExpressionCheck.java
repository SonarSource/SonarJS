/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.statement.IfStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S1126",
  name = "Return of boolean expressions should not be wrapped into an \"if-then-else\" statement",
  priority = Priority.MINOR,
  tags = {Tags.CLUMSY})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("2min")
public class ReturnOfBooleanExpressionCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Replace this if-then-else statement by a single return statement.";

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    if (tree.elseClause() != null && returnsBoolean(tree.elseClause().statement()) && returnsBoolean(tree.statement())) {
      addIssue(tree, MESSAGE);
    }

    visitIf(tree);
  }

  public static boolean returnsBoolean(StatementTree statement) {
    return isBlockReturningBooleanLiteral(statement) || isSimpleReturnBooleanLiteral(statement);
  }

  public static boolean isBlockReturningBooleanLiteral(StatementTree statement) {
    if (statement.is(Kind.BLOCK)) {
      BlockTree block = (BlockTree) statement;

      return block.statements().size() == 1 && isSimpleReturnBooleanLiteral(block.statements().get(0));
    }

    return false;
  }

  public static boolean isSimpleReturnBooleanLiteral(StatementTree statement) {
    if (statement.is(Kind.RETURN_STATEMENT)) {
      ExpressionTree returnExpr = ((ReturnStatementTree) statement).expression();

      return returnExpr != null && returnExpr.is(Kind.BOOLEAN_LITERAL);
    }

    return false;
  }

  private void visitIf(IfStatementTree tree) {
    scan(tree.condition());
    scan(tree.statement());

    ElseClauseTree elseClauseTree = tree.elseClause();
    if (tree.elseClause() != null && elseClauseTree.statement().is(Kind.IF_STATEMENT)) {
      visitIf((IfStatementTreeImpl) tree.elseClause().statement());

    } else {
      scan(tree.elseClause());
    }
  }
}
