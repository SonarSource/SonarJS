/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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

import java.util.List;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.ModuleTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.DefaultClauseTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3972")
public class SameLineConditionalCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Move this \"if\" to a new line or add the missing \"else\".";

  @Override
  public void visitModule(ModuleTree tree) {
    visitStatements(tree.items());
    super.visitModule(tree);
  }

  @Override
  public void visitBlock(BlockTree tree) {
    visitStatements(tree.statements());
    super.visitBlock(tree);
  }

  @Override
  public void visitDefaultClause(DefaultClauseTree tree) {
    visitStatements(tree.statements());
    super.visitDefaultClause(tree);
  }

  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    visitStatements(tree.statements());
    super.visitCaseClause(tree);
  }

  private <T extends Tree> void visitStatements(List<T> statementTrees) {
    if (statementTrees.size() < 2) {
      return;
    }

    for (int i = 1; i < statementTrees.size(); i++) {
      Tree currentStatement = statementTrees.get(i);
      Tree previousStatement = statementTrees.get(i - 1);

      if (currentStatement.is(Kind.IF_STATEMENT) && previousStatement.is(Kind.IF_STATEMENT)) {
        int previousStatementLastLine = previousStatement.lastToken().endLine();
        int previousStatementFirstLine = previousStatement.firstToken().line();
        int currentStatementFirstLine = currentStatement.firstToken().line();
        int currentStatementLastLine = currentStatement.lastToken().endLine();

        if (previousStatementLastLine == currentStatementFirstLine && previousStatementFirstLine != currentStatementLastLine) {
          addIssue(currentStatement.firstToken(), MESSAGE);
        }
      }
    }
  }
}
