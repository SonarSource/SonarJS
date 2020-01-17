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

import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.SyntacticEquivalence;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.MemberExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S1697")
public class NullDereferenceInConditionalCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Either reverse the equality operator in the \"%s\" null test, or reverse the logical operator that follows it.";

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (isAndWithEqualToNull(tree) || isOrWithNonEqualToNull(tree)) {
      BinaryExpressionTree leftOperand = (BinaryExpressionTree) CheckUtils.removeParenthesis(tree.leftOperand());
      ExpressionTree expression = CheckUtils.removeParenthesis(getNonNullLiteralOperand(leftOperand));
      tree.rightOperand().accept(new NullExpressionUsageVisitor(expression, this));
    }
    super.visitBinaryExpression(tree);
  }

  private static ExpressionTree getNonNullLiteralOperand(BinaryExpressionTree binaryExpressionTree) {
    if (isNullOrUndefined(binaryExpressionTree.leftOperand())) {
      return binaryExpressionTree.rightOperand();
    }
    return binaryExpressionTree.leftOperand();
  }

  private static boolean isAndWithEqualToNull(BinaryExpressionTree tree) {
    return tree.is(Tree.Kind.CONDITIONAL_AND)
      && isNullComparison(tree.leftOperand(), Tree.Kind.EQUAL_TO, Tree.Kind.STRICT_EQUAL_TO);
  }

  private static boolean isOrWithNonEqualToNull(BinaryExpressionTree tree) {
    return tree.is(Tree.Kind.CONDITIONAL_OR)
      && isNullComparison(tree.leftOperand(), Tree.Kind.NOT_EQUAL_TO, Tree.Kind.STRICT_NOT_EQUAL_TO);
  }

  private static boolean isNullComparison(ExpressionTree expression, Tree.Kind kind1, Tree.Kind kind2) {
    ExpressionTree tree = CheckUtils.removeParenthesis(expression);
    if (tree.is(kind1, kind2)) {
      BinaryExpressionTree binaryExp = (BinaryExpressionTree) tree;
      return isNullOrUndefined(binaryExp.leftOperand()) || isNullOrUndefined(binaryExp.rightOperand());
    }
    return false;
  }

  private static boolean isNullOrUndefined(Tree tree) {
    return tree.is(Tree.Kind.NULL_LITERAL)
      || (tree.is(Tree.Kind.IDENTIFIER_REFERENCE) && "undefined".equals(((IdentifierTree) tree).identifierToken().text()));
  }

  private static class NullExpressionUsageVisitor extends DoubleDispatchVisitorCheck {

    private ExpressionTree nullExpression;
    private JavaScriptCheck check;

    NullExpressionUsageVisitor(ExpressionTree nullExpression, JavaScriptCheck check) {
      this.nullExpression = nullExpression;
      this.check = check;
    }

    @Override
    public void visitMemberExpression(MemberExpressionTree tree) {
      if (SyntacticEquivalence.areEquivalent(tree.object(), nullExpression)) {
        check.addIssue(nullExpression, String.format(MESSAGE, CheckUtils.asString(nullExpression)));
      }
      super.visitMemberExpression(tree);
    }

  }

}
