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

import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArgumentListTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "Eval")
public class EvalCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this use of the \"eval\" function.";

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    ExpressionTree callee = tree.callee();
    if (callee.is(Kind.IDENTIFIER_REFERENCE) && "eval".equals(((IdentifierTree) callee).name()) && atLeastOneArgumentNotLiteral(tree.argumentClause())) {
      addIssue(callee, MESSAGE);
    }

    super.visitCallExpression(tree);
  }

  private static boolean atLeastOneArgumentNotLiteral(ArgumentListTree arguments) {
    for (ExpressionTree expressionTree : arguments.arguments()) {
      if (!expressionTree.is(Kind.STRING_LITERAL)) {
        return true;
      }
    }

    return false;
  }

}
