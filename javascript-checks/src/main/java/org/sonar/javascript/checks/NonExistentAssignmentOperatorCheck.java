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

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "S2757")
public class NonExistentAssignmentOperatorCheck extends SubscriptionVisitorCheck {

  private static final String PLUS_MESSAGE = "Was \"+=\" meant instead?";
  private static final String MINUS_MESSAGE = "Was \"-=\" meant instead?";

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(Kind.ASSIGNMENT);
  }

  @Override
  public void visitNode(Tree tree) {
    AssignmentExpressionTree assignment = (AssignmentExpressionTree) tree;
    ExpressionTree expression = assignment.expression();
    if (expression.is(Kind.UNARY_PLUS, Kind.UNARY_MINUS)) {
      UnaryExpressionTree unaryExpression = (UnaryExpressionTree) expression;
      SyntaxToken assignmentOperator = assignment.operator();
      SyntaxToken expressionOperator = unaryExpression.operator();
      if (areAdjacent(assignmentOperator, expressionOperator) && !areAdjacent(expressionOperator, unaryExpression.expression())) {
        String message = expression.is(Kind.UNARY_PLUS) ? PLUS_MESSAGE : MINUS_MESSAGE;
        addIssue(new PreciseIssue(this, new IssueLocation(assignmentOperator, expressionOperator, message)));
      }
    }
    super.visitNode(tree);
  }

  private static boolean areAdjacent(Tree tree1, Tree tree2) {
    SyntaxToken tree1LastToken = ((JavaScriptTree) tree1).getLastToken();
    SyntaxToken tree2FirstToken = ((JavaScriptTree) tree2).getFirstToken();
    return tree1LastToken.endColumn() == tree2FirstToken.column() && tree1LastToken.endLine() == tree2FirstToken.line();
  }

}
