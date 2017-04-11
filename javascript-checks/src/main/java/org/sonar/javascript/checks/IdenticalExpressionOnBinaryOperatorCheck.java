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
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.SyntacticEquivalence;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S1764")
public class IdenticalExpressionOnBinaryOperatorCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Correct one of the identical sub-expressions on both sides of operator \"%s\"";

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (!tree.is(Kind.MULTIPLY, Kind.PLUS, Kind.ASSIGNMENT)
      && SyntacticEquivalence.areEquivalent(tree.leftOperand(), tree.rightOperand()) && !isExcluded(tree)) {

      String message = String.format(MESSAGE, tree.operatorToken().text());
      addIssue(tree.rightOperand(), message)
        .secondary(tree.leftOperand());
    }

    super.visitBinaryExpression(tree);
  }

  private static boolean isExcluded(BinaryExpressionTree tree) {
    return tree.is(Kind.COMMA_OPERATOR, Kind.INSTANCE_OF) || isOneOntoOneShifting(tree) || isPotentialNanComparison(tree);
  }

  private static boolean isPotentialNanComparison(BinaryExpressionTree tree) {
    return tree.is(KindSet.EQUALITY_KINDS)
      && (tree.leftOperand().is(
      Kind.IDENTIFIER_REFERENCE,
      Kind.BRACKET_MEMBER_EXPRESSION,
      Kind.DOT_MEMBER_EXPRESSION) || tree.leftOperand() instanceof UnaryExpressionTree);

  }

  private static boolean isOneOntoOneShifting(BinaryExpressionTree tree) {
    return tree.is(Kind.LEFT_SHIFT)
      && tree.leftOperand().is(Kind.NUMERIC_LITERAL)
      && "1".equals(((LiteralTree) tree.leftOperand()).value());
  }

}
