/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3523",
  name = "Function constructors should not be used",
  priority = Priority.CRITICAL,
  tags = {Tags.CLUMSY, Tags.SECURITY})
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class FunctionConstructorCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Simply declare this function instead.";

  /**
   * Tracks:
   * <pre>
   *   new Function('console.log("hello"');
   *   new Function('a', 'b', 'console.log(a + b);
   * </pre>
   * Does not track:
   * <pre>
   *   new Function;
   *   new Function();
   * </pre>
   */
  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    ExpressionTree expression = tree.expression();
    if (expression.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
      SyntaxToken token = ((IdentifierTree)expression).identifierToken();
      if ("Function".equals(token.text()) && tree.arguments() != null && ! tree.arguments().parameters().isEmpty()) {
        addIssue(new PreciseIssue(this, new IssueLocation(tree.newKeyword(), tree.expression(), MESSAGE)));
      }
    }

    super.visitNewExpression(tree);
  }

  /**
   * Same as {@link #visitNewExpression(NewExpressionTree)}, without the "new".
   */
  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    ExpressionTree callee = tree.callee();
    if (callee.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
      SyntaxToken token = ((IdentifierTree)callee).identifierToken();
      if ("Function".equals(token.text()) && tree.arguments() != null && ! tree.arguments().parameters().isEmpty()) {
        addIssue(new PreciseIssue(this, new IssueLocation(callee, callee, MESSAGE)));
      }
    }
    
    super.visitCallExpression(tree);
  }
  
}
