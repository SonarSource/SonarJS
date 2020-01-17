/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArgumentListTree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@JavaScriptRule
@Rule(key = "S3523")
public class FunctionConstructorCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Review this \"Function\" call and make sure its arguments are properly validated.";

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    if (isFunctionConstructorWithPossibleInjection(tree.expression(), tree.argumentClause())) {
      addIssue(new PreciseIssue(this, new IssueLocation(tree.newKeyword(), tree.expression(), MESSAGE)));
    }

    super.visitNewExpression(tree);
  }

  /**
   * Same as {@link #visitNewExpression(NewExpressionTree)}, without the "new".
   */
  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (isFunctionConstructorWithPossibleInjection(tree.callee(), tree.argumentClause())) {
      addIssue(tree.callee(), MESSAGE);
    }
    
    super.visitCallExpression(tree);
  }
  
  private static boolean isFunctionConstructorWithPossibleInjection(ExpressionTree tree, @Nullable ArgumentListTree arguments) {
    boolean result = false;
    if (tree.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
      String name = ((IdentifierTree)tree).name();
      result = "Function".equals(name) && arguments != null && atLeastOneArgumentNotLiteral(arguments);
    }
    return result;
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
