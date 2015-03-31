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

import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S1125",
  name = "Literal boolean values should not be used in condition expressions",
  priority = Priority.MINOR,
  tags = {Tags.CLUMSY})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.READABILITY)
@SqaleConstantRemediation("2min")
public class BooleanEqualityComparisonCheck extends BaseTreeVisitor {

  private static final Kind[] BINARY_OPERATORS = {
      Kind.CONDITIONAL_AND,
      Kind.CONDITIONAL_OR,
      Kind.EQUAL_TO,
      Kind.NOT_EQUAL_TO
  };

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (tree.is(Kind.LOGICAL_COMPLEMENT)) {
      visitExpression(tree.expression());
    }
    super.visitUnaryExpression(tree);
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (tree.is(BINARY_OPERATORS)) {
      visitExpression(tree.leftOperand());
      visitExpression(tree.rightOperand());
    }
    super.visitBinaryExpression(tree);
  }

  private void visitExpression(ExpressionTree expression) {
    if (expression.is(Kind.BOOLEAN_LITERAL)){
      String message = String.format("Remove the literal \"%s\" boolean value.", ((LiteralTree) expression).value());
      getContext().addIssue(this, expression, message);
    }
  }

}
