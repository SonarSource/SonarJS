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
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
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
public class CollapsibleIfStatementsCheck extends BaseTreeVisitor {

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    if (tree.elseClause() == null) {
      StatementTree innerStatement = tree.statement();

      if (isBlockAndContainsOnlyOneIfStatement(innerStatement) || isIfStatementWithoutElse(innerStatement)) {
        getContext().addIssue(this, tree, "Merge this if statement with the nested one.");
      }
    }
    super.visitIfStatement(tree);
  }

  private boolean isBlockAndContainsOnlyOneIfStatement(StatementTree statement) {
    if (!statement.is(Kind.BLOCK)) {
      return false;
    }
    BlockTree block = (BlockTree) statement;

    return block.statements().size() == 1 && isIfStatementWithoutElse(block.statements().get(0));
  }

  private boolean isIfStatementWithoutElse(StatementTree statement) {
    return statement.is(Kind.IF_STATEMENT) && ((IfStatementTree)statement).elseClause() == null;
  }

}
