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
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3981")
public class CollectionSizeAndArrayLengthCheck extends DoubleDispatchVisitorCheck {

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (tree.is(Tree.Kind.LESS_THAN, Tree.Kind.GREATER_THAN_OR_EQUAL_TO) && isZeroLiteral(tree.rightOperand())) {
      ExpressionTree leftOperand = tree.leftOperand();
      if (leftOperand.is(Tree.Kind.DOT_MEMBER_EXPRESSION)
          && isLengthOrSizeProperty((DotMemberExpressionTree) leftOperand)) {
        String propertyName = ((DotMemberExpressionTree) leftOperand).property().name();
        addIssue(tree, String.format("The %s is always \">=0\", so fix this test to get the real expected behavior.", propertyName));
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
