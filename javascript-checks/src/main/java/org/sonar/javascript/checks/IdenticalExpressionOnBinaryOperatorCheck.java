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
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.ast.visitors.SyntacticEquivalence;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;

@Rule(
  key = "S1764",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG, Tags.CERT})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.CRITICAL)
public class IdenticalExpressionOnBinaryOperatorCheck extends BaseTreeVisitor {

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (!tree.is(Kind.MULTIPLY, Kind.PLUS, Kind.ASSIGNMENT)
      && SyntacticEquivalence.areEquivalent(tree.leftOperand(), tree.rightOperand()) && isExcluded(tree)) {

      getContext().addIssue(this,
          tree,
          "Identical sub-expressions on both sides of operator \"" + tree.operator().text() + "\"");
    }

    super.visitBinaryExpression(tree);
  }

  private boolean isExcluded(BinaryExpressionTree tree) {
    return !isOneOntoOneShifting(tree) && !isPotentialNanComparison(tree);
  }

  private boolean isPotentialNanComparison(BinaryExpressionTree tree) {
    return tree.is(Kind.STRICT_NOT_EQUAL_TO)
      && tree.leftOperand().is(Kind.IDENTIFIER_REFERENCE, Kind.IDENTIFIER, Kind.BRACKET_MEMBER_EXPRESSION, Kind.DOT_MEMBER_EXPRESSION);

  }

  private boolean isOneOntoOneShifting(BinaryExpressionTree tree) {
    return tree.is(Kind.LEFT_SHIFT)
      && tree.leftOperand().is(Kind.NUMERIC_LITERAL)
      && "1".equals(((LiteralTree) tree.leftOperand()).value());
  }

}
