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

import javax.annotation.Nullable;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "CollapsibleIfStatements",
  name = "Collapsible \"if\" statements should be merged",
  priority = Priority.MAJOR,
  tags = {Tags.CLUMSY})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("5min")
public class CollapsibleIfStatementsCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Merge this if statement with the nested one.";
  private static final String SECONDARY_MESSAGE = "Nested \"if\" statement";

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    if (tree.elseClause() == null) {
      IfStatementTree innerIfStatement = getCollapsibleIfStatement(tree.statement());

      if (innerIfStatement != null) {
        IssueLocation primaryLocation = issueLocation(tree, MESSAGE);
        IssueLocation secondaryLocation = issueLocation(innerIfStatement, SECONDARY_MESSAGE);
        addIssue(new PreciseIssue(this, primaryLocation).secondary(secondaryLocation));
      }
    }

    super.visitIfStatement(tree);
  }

  private static IssueLocation issueLocation(IfStatementTree tree, String message) {
    return new IssueLocation(tree.ifKeyword(), tree.closeParenthesis(), message);
  }

  @Nullable
  private static IfStatementTree getCollapsibleIfStatement(StatementTree statement) {
    if (statement.is(Kind.BLOCK)) {
      BlockTree block = (BlockTree) statement;
      if (block.statements().size() == 1) {
        return getIfStatementWithoutElse(block.statements().get(0));
      }

    } else {
      return getIfStatementWithoutElse(statement);
    }

    return null;
  }

  @Nullable
  private static IfStatementTree getIfStatementWithoutElse(StatementTree statement) {
    if (statement.is(Kind.IF_STATEMENT) && ((IfStatementTree) statement).elseClause() == null) {
      return (IfStatementTree) statement;
    } else {
      return null;
    }
  }

}
