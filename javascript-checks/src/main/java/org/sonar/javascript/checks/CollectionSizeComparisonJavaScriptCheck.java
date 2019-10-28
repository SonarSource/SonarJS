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

import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S3981")
public class CollectionSizeComparisonJavaScriptCheck extends DoubleDispatchVisitorCheck {

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (tree.is(Tree.Kind.LESS_THAN, Tree.Kind.GREATER_THAN_OR_EQUAL_TO)
        && isZeroLiteral(tree.rightOperand())
        && tree.leftOperand().is(Tree.Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree leftOperand = ((DotMemberExpressionTree) tree.leftOperand());
      if (isLengthOrSizeProperty(leftOperand)) {
        String propertyName = leftOperand.property().name();
        addIssue(tree, String.format("Fix this expression; %s of \"%s\" is always greater or equal to zero.", propertyName, CheckUtils.asString(leftOperand.object())));
      }
    }
    super.visitBinaryExpression(tree);
  }

  private static boolean isLengthOrSizeProperty(DotMemberExpressionTree memberExpressionTree) {
    String name = memberExpressionTree.property().name();
    return "length".equals(name) || "size".equals(name);
  }

  private static boolean isZeroLiteral(ExpressionTree tree) {
    return tree.is(Tree.Kind.NUMERIC_LITERAL) && ((LiteralTree) tree).value().equals("0");
  }
}
