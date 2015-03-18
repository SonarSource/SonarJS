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

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.SyntacticEquivalence;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.statement.ElseClauseTree;
import org.sonar.javascript.model.interfaces.statement.IfStatementTree;
import org.sonar.javascript.model.interfaces.statement.StatementTree;
import org.sonar.javascript.model.interfaces.statement.SwitchClauseTree;
import org.sonar.javascript.model.interfaces.statement.SwitchStatementTree;

import com.google.common.collect.Iterables;
import com.sonar.sslr.api.AstNode;

import java.util.List;

@Rule(
  key = "S1871",
  priority = Priority.MAJOR,
  tags = {Tags.BUG})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class DuplicateBranchImplementationCheck extends BaseTreeVisitor {

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    StatementTree implementation = tree.thenStatement();
    ElseClauseTree elseClause = tree.elseClause();

    while (elseClause != null) {
      StatementTree implementationToCompare = getImplementationFromElseClause(elseClause);

      if (SyntacticEquivalence.areEquivalent(implementation, implementationToCompare)) {
        getContext().addIssue(this,
          implementationToCompare,
          "Either merge this branch with the identical one on line \"" + ((AstNode) implementation).getTokenLine() + "\" or change one of the implementations.");
        break;
      }
      elseClause = getNextElse(elseClause);
    }

    super.visitIfStatement(tree);
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    for (int i = 0; i < tree.cases().size(); i++) {
      SwitchClauseTree caseTree = tree.cases().get(i);

      // FIXME martin: Don't check duplication for case with fall through on the next case.
      if (caseTree.statements().isEmpty() || isCaseEndingWithoutJumpStmt(caseTree)) {
        continue;
      }

      compareWithNextCases(tree, i, caseTree);
    }
  }

  private void compareWithNextCases(SwitchStatementTree tree, int indexCaseReference, SwitchClauseTree caseTree) {
    for (int j = indexCaseReference + 1; j < tree.cases().size(); j++) {
      SwitchClauseTree caseTreeToCompare = tree.cases().get(j);

      // FIXME martin: Don't check duplication for case with fall through on the next case.
      if (caseTreeToCompare.statements().isEmpty() || isCaseEndingWithoutJumpStmt(caseTreeToCompare)) {
        continue;
      }

      // Remove the jump statement if comparing to default case
      List<StatementTree> caseStatements = caseTreeToCompare.is(Kind.DEFAULT_CLAUSE) ? caseTree.statements().subList(0, caseTree.statements().size() - 1) : caseTree.statements();

      if (SyntacticEquivalence.areEquivalent(caseStatements, caseTreeToCompare.statements())) {
        getContext().addIssue(this,
          caseTreeToCompare,
          "Either merge this case with the identical one on line \"" + ((AstNode) caseTree).getTokenLine() + "\" or change one of the implementations.");
        // break the inner loop
        break;
      }
    }
  }

  private boolean isCaseEndingWithoutJumpStmt(SwitchClauseTree caseTree) {
    return caseTree.is(Kind.CASE_CLAUSE) && !isJumpStatement(Iterables.getLast(caseTree.statements()));
  }

  private boolean isJumpStatement(StatementTree statement) {
    return statement.is(
      Kind.BREAK_STATEMENT,
      Kind.RETURN_STATEMENT,
      Kind.CONTINUE_STATEMENT,
      Kind.THROW_STATEMENT);
  }

  private static StatementTree getImplementationFromElseClause(ElseClauseTree elseClause) {
    return elseClause.statement().is(Kind.IF_STATEMENT) ? ((IfStatementTree) elseClause.statement()).thenStatement() : elseClause.statement();
  }

  public ElseClauseTree getNextElse(ElseClauseTree elseClause) {
    return elseClause.statement().is(Kind.IF_STATEMENT) ? ((IfStatementTree) elseClause.statement()).elseClause() : null;
  }
}
