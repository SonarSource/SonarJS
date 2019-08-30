/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@JavaScriptRule
@Rule(key = "S2757")
public class NonExistentAssignmentOperatorCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Was \"%s=\" meant instead?";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(Kind.ASSIGNMENT);
  }

  @Override
  public void visitNode(Tree tree) {
    AssignmentExpressionTree assignment = (AssignmentExpressionTree) tree;
    ExpressionTree expression = assignment.expression();
    if (expression.is(Kind.UNARY_PLUS, Kind.UNARY_MINUS, Kind.LOGICAL_COMPLEMENT)) {
      UnaryExpressionTree unaryExpression = (UnaryExpressionTree) expression;
      SyntaxToken assignmentOperator = assignment.operatorToken();
      SyntaxToken expressionOperator = unaryExpression.operatorToken();
      if (areAdjacent(assignmentOperator, expressionOperator) && !areAdjacent(expressionOperator, unaryExpression.expression())) {
        String message = String.format(MESSAGE, unaryExpression.operatorToken());
        addIssue(new PreciseIssue(this, new IssueLocation(assignmentOperator, expressionOperator, message)));
      }
    }
    super.visitNode(tree);
  }

  private static boolean areAdjacent(Tree tree1, Tree tree2) {
    SyntaxToken tree1LastToken = tree1.lastToken();
    SyntaxToken tree2FirstToken = tree2.firstToken();
    return tree1LastToken.endColumn() == tree2FirstToken.column() && tree1LastToken.endLine() == tree2FirstToken.line();
  }

}
