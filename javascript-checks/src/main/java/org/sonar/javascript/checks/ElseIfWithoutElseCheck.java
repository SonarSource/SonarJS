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

import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.statement.IfStatementTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@Rule(key = "ElseIfWithoutElse")
public class ElseIfWithoutElseCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Add the missing \"else\" clause.";

  @Override
  public void visitElseClause(ElseClauseTree tree) {
    if (tree.statement().is(Kind.IF_STATEMENT)) {
      IfStatementTreeImpl ifStmt = (IfStatementTreeImpl) tree.statement();

      if (!ifStmt.hasElse()) {
        addIssue(new PreciseIssue(this, new IssueLocation(tree.elseKeyword(), ifStmt.ifKeyword(), MESSAGE)));
      }

    }
    super.visitElseClause(tree);
  }

}
