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

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.metrics.LineVisitor;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;

@Rule(key = "S1871")
public class DuplicateBranchImplementationCheck extends AbstractDuplicateBranchImplementationCheck {

  private static final String MESSAGE = "Either merge this %s with the identical one on line \"%s\" or change one of the implementations.";

  @Override
  protected void checkDuplicatedBranches(List<Tree> branches) {
    Set<Tree> withIssue = new HashSet<>();

    for (int i = 0; i < branches.size(); i++) {
      Tree currentBranch = branches.get(i);

      for (int j = i + 1; j < branches.size(); j++) {
        Tree comparedBranch = branches.get(j);

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


  @Override
  protected void allBranchesDuplicated(Tree tree) {
    // do nothing, covered with S3923
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

}
