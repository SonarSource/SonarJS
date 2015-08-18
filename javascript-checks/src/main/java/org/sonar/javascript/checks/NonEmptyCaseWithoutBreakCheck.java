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

import java.util.LinkedList;
import java.util.List;

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

import com.google.common.collect.Iterables;

@Rule(
    key = "NonEmptyCaseWithoutBreak",
    name = "Switch cases should end with an unconditional \"break\" statement",
    priority = Priority.CRITICAL,
    tags = {Tags.CERT, Tags.CWE, Tags.MISRA, Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("10min")
public class NonEmptyCaseWithoutBreakCheck extends BaseTreeVisitor {

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    List<SwitchClauseTree> cases = new LinkedList<>(tree.cases());
    cases.remove(cases.size() - 1);
    for (SwitchClauseTree switchClauseTree : cases){
      List<StatementTree> statements = switchClauseTree.statements();
      if (!statements.isEmpty() && !endsWithJump(statements)) {
        getContext().addIssue(this, switchClauseTree, "Last statement in this switch-clause should be an unconditional break.");
      }
    }

    super.visitSwitchStatement(tree);
  }

  private boolean endsWithJump(List<StatementTree> statements) {
    if (statements.isEmpty()) {
      return false;
    }
    if (statements.size() == 1 && statements.get(0).is(Kind.BLOCK)) {
      BlockTree block = (BlockTree) statements.get(0);
      return endsWithJump(block.statements());
    }
    return Iterables.getLast(statements).is(Kind.BREAK_STATEMENT, Kind.RETURN_STATEMENT, Kind.THROW_STATEMENT, Kind.CONTINUE_STATEMENT);
  }
}
