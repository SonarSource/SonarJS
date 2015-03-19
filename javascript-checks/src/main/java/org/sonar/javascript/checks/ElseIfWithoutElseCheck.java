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
import org.sonar.javascript.model.internal.statement.IfStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "ElseIfWithoutElse",
    name = "\"if ... else if\" constructs shall be terminated with an \"else\" clause",
  priority = Priority.MAJOR,
  tags = {Tags.CERT, Tags.MISRA})
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("5min")
public class ElseIfWithoutElseCheck extends BaseTreeVisitor {

  @Override
  public void visitElseClause(ElseClauseTree tree) {
    if (tree.statement().is(Kind.IF_STATEMENT)) {
      IfStatementTreeImpl ifStmt = (IfStatementTreeImpl) tree.statement();

      if (!ifStmt.hasElse()) {
        getContext().addIssue(this, ifStmt, "Add the missing \"else\" clause.");
      }

    }
    super.visitElseClause(tree);
  }

}
