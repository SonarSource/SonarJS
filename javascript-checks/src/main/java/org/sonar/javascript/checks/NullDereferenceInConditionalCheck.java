/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.checks;

import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.AstTreeVisitorContext;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.SyntacticEquivalence;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.expression.MemberExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ParenthesisedExpressionTree;
import org.sonar.squidbridge.annotations.Tags;

@Rule(
  key = "S1697",
  priority = Priority.BLOCKER,
  tags = {Tags.BUG})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.BLOCKER)
public class NullDereferenceInConditionalCheck extends BaseTreeVisitor {

  private static final String MESSAGE_FORMAT =
    "Either reverse the equality operator in the \"%s\" null test, or reverse the logical operator that follows it.";

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (isAndWithEqualToNull(tree) || isOrWithNonEqualToNull(tree)) {
      BinaryExpressionTree leftOperand = (BinaryExpressionTree) removeParenthesis(tree.leftOperand());
      ExpressionTree expression = removeParenthesis(getNonNullLiteralOperand(leftOperand));
      tree.rightOperand().accept(new NullExpressionUsageVisitor(expression, getContext()));
    }
    super.visitBinaryExpression(tree);
  }

  private ExpressionTree removeParenthesis(ExpressionTree expressionTree) {
    if (expressionTree.is(Tree.Kind.PARENTHESISED_EXPRESSION)) {
      return removeParenthesis(((ParenthesisedExpressionTree) expressionTree).expression());
    }
    return expressionTree;
  }

  private ExpressionTree getNonNullLiteralOperand(BinaryExpressionTree binaryExpressionTree) {
    if (isNullOrUndefined(binaryExpressionTree.leftOperand())) {
      return binaryExpressionTree.rightOperand();
    }
    return binaryExpressionTree.leftOperand();
  }

  private boolean isAndWithEqualToNull(BinaryExpressionTree tree) {
    return tree.is(Tree.Kind.CONDITIONAL_AND)
      && isNullComparison(tree.leftOperand(), Tree.Kind.EQUAL_TO, Tree.Kind.STRICT_EQUAL_TO);
  }

  private boolean isOrWithNonEqualToNull(BinaryExpressionTree tree) {
    return tree.is(Tree.Kind.CONDITIONAL_OR)
      && isNullComparison(tree.leftOperand(), Tree.Kind.NOT_EQUAL_TO, Tree.Kind.STRICT_NOT_EQUAL_TO);
  }

  private boolean isNullComparison(ExpressionTree expression, Tree.Kind kind1, Tree.Kind kind2) {
    ExpressionTree tree = removeParenthesis(expression);
    if (tree.is(kind1, kind2)) {
      BinaryExpressionTree binaryExp = (BinaryExpressionTree) tree;
      return isNullOrUndefined(binaryExp.leftOperand()) || isNullOrUndefined(binaryExp.rightOperand());
    }
    return false;
  }

  private boolean isNullOrUndefined(Tree tree) {
    return tree.is(Tree.Kind.NULL_LITERAL)
      || tree.is(Tree.Kind.IDENTIFIER_REFERENCE) && "undefined".equals(((IdentifierTree) tree).identifierToken().text());
  }

  private class NullExpressionUsageVisitor extends BaseTreeVisitor {

    private ExpressionTree nullExpression;
    private AstTreeVisitorContext context;

    public NullExpressionUsageVisitor(ExpressionTree nullExpression, AstTreeVisitorContext context) {
      this.nullExpression = nullExpression;
      this.context = context;
    }

    @Override
    public void visitMemberExpression(MemberExpressionTree tree) {
      if (SyntacticEquivalence.areEquivalent(tree.object(), nullExpression)) {
        context.addIssue(NullDereferenceInConditionalCheck.this, nullExpression, 
          String.format(MESSAGE_FORMAT, CheckUtils.asString(nullExpression)));
      }
      super.visitMemberExpression(tree);
    }

  }

}
