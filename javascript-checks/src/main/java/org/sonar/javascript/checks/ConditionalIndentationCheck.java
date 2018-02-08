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
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3973")
public class ConditionalIndentationCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Use curly braces or indentation to denote the code conditionally executed by this \"%s\".";

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    if (!tree.parent().is(Kind.ELSE_CLAUSE)) {
      checkIndentation(tree.ifKeyword(), tree.statement());
    }
    super.visitIfStatement(tree);
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    checkIndentation(tree.whileKeyword(), tree.statement());
    super.visitWhileStatement(tree);
  }

  @Override
  public void visitElseClause(ElseClauseTree tree) {
    if (tree.statement().is(Kind.IF_STATEMENT)) {
      checkIndentation(tree.elseKeyword(), ((IfStatementTree) tree.statement()).statement());
    } else {
      checkIndentation(tree.elseKeyword(), tree.statement());
    }
    super.visitElseClause(tree);
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    checkIndentation(tree.forKeyword(), tree.statement());
    super.visitForObjectStatement(tree);
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    checkIndentation(tree.forKeyword(), tree.statement());
    super.visitForStatement(tree);
  }

  private void checkIndentation(SyntaxToken conditionalFirstToken, StatementTree statement) {
    if (statement.is(Tree.Kind.BLOCK)) {
      return;
    }

    SyntaxToken firstStatementToken = statement.firstToken();
    if (conditionalFirstToken.column() >= firstStatementToken.column()) {
      String message = String.format(MESSAGE, conditionalFirstToken.text());
      addIssue(conditionalFirstToken, message)
        .secondary(firstStatementToken);
    }
  }

}
