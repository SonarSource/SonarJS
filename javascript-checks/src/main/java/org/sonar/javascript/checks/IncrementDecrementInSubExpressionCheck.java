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

import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S881")
public class IncrementDecrementInSubExpressionCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Extract this %s operation into a dedicated statement.";

  @Override
  public void visitExpressionStatement(ExpressionStatementTree tree) {
    if (tree.expression().is(KindSet.INC_DEC_KINDS)) {
      scan(((UnaryExpressionTree) tree.expression()).expression());
    } else {
      scan(tree.expression());
    }
  }

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (tree.is(KindSet.INC_DEC_KINDS)) {
      raiseIssue(tree);
    }

    super.visitUnaryExpression(tree);
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    scan(tree.init());
    scan(tree.condition());
    scanUpdateClause(tree.update());
    scan(tree.statement());
  }

  private void scanUpdateClause(@Nullable ExpressionTree tree) {
    if (tree != null) {
      if (tree.is(KindSet.INC_DEC_KINDS)) {
        scan(((UnaryExpressionTree) tree).expression());

      } else if (tree.is(Kind.COMMA_OPERATOR)) {
        BinaryExpressionTree expressionList = (BinaryExpressionTree) tree;
        scanUpdateClause(expressionList.leftOperand());
        scanUpdateClause(expressionList.rightOperand());

      } else {
        scan(tree);
      }
    }
  }

  private void raiseIssue(UnaryExpressionTree tree) {
    String message = String.format(MESSAGE, "++".equals(tree.operatorToken().text()) ? "increment" : "decrement");
    addIssue(tree.operatorToken(), message);
  }
}
