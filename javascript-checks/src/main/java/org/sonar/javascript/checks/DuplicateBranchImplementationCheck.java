/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import com.google.common.collect.Iterables;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.metrics.LineVisitor;
import org.sonar.javascript.tree.SyntacticEquivalence;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;

@Rule(key = "S1871")
public class DuplicateBranchImplementationCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Either merge this %s with the identical one on line \"%s\" or change one of the implementations.";

  private Set<IfStatementTree> chainedIfStatements = new HashSet<>();

  @Override
  public void visitScript(ScriptTree tree) {
    chainedIfStatements.clear();
    super.visitScript(tree);
  }

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    if (!chainedIfStatements.contains(tree)) {
      checkTopIfStatement(tree);
    }

    super.visitIfStatement(tree);
  }

  private void checkTopIfStatement(IfStatementTree ifStatement) {
    List<StatementTree> branches = collectBranches(ifStatement);

    if (allBranchesPresent(ifStatement) && allBranchesEquivalent(branches)) {
      // issue for bug rule will be raised
      return;
    }

    checkDuplicatedBranches(branches);
  }

  private <T extends Tree> void checkDuplicatedBranches(List<T> branches) {
    Set<T> withIssue = new HashSet<>();

    for (int i = 0; i < branches.size(); i++) {
      T currentBranch = branches.get(i);

      for (int j = i + 1; j < branches.size(); j++) {
        T comparedBranch = branches.get(j);

        if (!withIssue.contains(comparedBranch)
          && syntacticallyEqual(currentBranch, comparedBranch)
          && linesOfCodeForBranch(comparedBranch) > 1) {

          IssueLocation secondary = new IssueLocation(currentBranch, "Original");
          String branchType = currentBranch instanceof SwitchClauseTree ? "case" : "branch";
          String message = String.format(MESSAGE, branchType, secondary.startLine());
          addIssue(comparedBranch, message).secondary(secondary);
          withIssue.add(comparedBranch);
        }
      }
    }
  }

  // T could be StatementTree (for IF statement) or SwitchClauseTree (for SWITCH statement)
  private static <T extends Tree> boolean allBranchesEquivalent(List<T> branches) {
    T firstBranch = branches.get(0);

    for (int i = 1; i < branches.size(); i++) {
      if (!syntacticallyEqual(firstBranch, branches.get(i))) {
        return false;
      }
    }

    return true;
  }

  private List<StatementTree> collectBranches(IfStatementTree ifStatement) {
    List<StatementTree> branches = new ArrayList<>();
    branches.add(ifStatement.statement());

    ElseClauseTree elseClause = ifStatement.elseClause();

    while (elseClause != null) {
      if (elseClause.statement().is(Kind.IF_STATEMENT)) {
        IfStatementTree chainedIfStatement = (IfStatementTree) elseClause.statement();
        chainedIfStatements.add(chainedIfStatement);
        branches.add(chainedIfStatement.statement());
        elseClause = chainedIfStatement.elseClause();

      } else {
        branches.add(elseClause.statement());
        elseClause = null;
      }
    }

    return branches;
  }

  private static boolean allBranchesPresent(IfStatementTree tree) {
    IfStatementTree lastIfStatement = tree;

    while (lastIfStatement.elseClause() != null) {
      StatementTree elseStatement = lastIfStatement.elseClause().statement();

      if (elseStatement.is(Kind.IF_STATEMENT)) {
        lastIfStatement = (IfStatementTree) elseStatement;
      } else {
        break;
      }
    }

    return lastIfStatement.elseClause() != null;
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    boolean hasClauseWithoutJump = false;
    boolean hasDefaultCase = false;

    List<SwitchClauseTree> branches = new ArrayList<>();

    for (int i = 0; i < tree.cases().size(); i++) {
      SwitchClauseTree caseTree = tree.cases().get(i);
      boolean isLast = (i == tree.cases().size() - 1);

      if (caseTree.is(Kind.DEFAULT_CLAUSE)) {
        hasDefaultCase = true;
      }

      if (!caseTree.statements().isEmpty() || isLast) {
        branches.add(caseTree);
      }

      if (!endsWithJump(caseTree) && !isLast) {
        hasClauseWithoutJump = true;
      }
    }

    if (!hasClauseWithoutJump && hasDefaultCase) {
      boolean allSwitchBranchesEquivalent = allBranchesEquivalent(branches);
      if (allSwitchBranchesEquivalent) {
        // covered by another rule S3923
        return;
      }
    }

    checkDuplicatedBranches(branches);
  }

  private static boolean endsWithJump(SwitchClauseTree caseTree) {
    return !caseTree.statements().isEmpty()
      && Iterables.getLast(caseTree.statements()).is(Kind.BREAK_STATEMENT, Kind.RETURN_STATEMENT, Kind.CONTINUE_STATEMENT, Kind.THROW_STATEMENT);
  }

  private static <T> int linesOfCodeForBranch(T branch) {
    if (branch instanceof SwitchClauseTree) {
      return new LineVisitor(normalize((SwitchClauseTree) branch)).getLinesOfCodeNumber();

    } else {
      StatementTree statementBranch = (StatementTree) branch;
      LineVisitor lineVisitor = statementBranch.is(Kind.BLOCK) ? new LineVisitor(((BlockTree) statementBranch).statements()) : new LineVisitor(statementBranch);
      return lineVisitor.getLinesOfCodeNumber();
    }
  }

  private static List<StatementTree> normalize(SwitchClauseTree switchClause) {
    List<StatementTree> list = switchClause.statements();
    if (!list.isEmpty() && list.get(list.size() - 1).is(Kind.BREAK_STATEMENT)) {
      return list.subList(0, list.size() - 1);
    } else {
      return list;
    }
  }

  private static <T extends Tree> boolean syntacticallyEqual(T first, T second) {
    if (first instanceof SwitchClauseTree) {
      return SyntacticEquivalence.areEquivalent(normalize((SwitchClauseTree) first), normalize((SwitchClauseTree) second));

    } else {
      return SyntacticEquivalence.areEquivalent(first, second);
    }
  }

}
