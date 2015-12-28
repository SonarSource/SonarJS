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

import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S3003",
  name = "Comparison operators should not be used with strings",
  priority = Priority.MAJOR,
  tags = Tags.SUSPICIOUS)
@ActivatedByDefault
@SqaleSubCharacteristic(SubCharacteristics.INSTRUCTION_RELIABILITY)
@SqaleConstantRemediation("5min")
public class StringsComparisonCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Convert operands of this use of \"%s\" to number type.";

  private static final Kind[] RELATIVE_OPERATIONS = {
    Kind.LESS_THAN,
    Kind.LESS_THAN_OR_EQUAL_TO,
    Kind.GREATER_THAN,
    Kind.GREATER_THAN_OR_EQUAL_TO
  };

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (tree.is(RELATIVE_OPERATIONS) && isString(tree.leftOperand()) && isString(tree.rightOperand())) {
      raiseIssue(tree);
    }

    super.visitBinaryExpression(tree);
  }

  private void raiseIssue(BinaryExpressionTree tree) {
    String message = String.format(MESSAGE, tree.operator().text());

    newIssue(tree.operator(), message)
      .secondary(tree.leftOperand())
      .secondary(tree.rightOperand());
  }

  private static boolean isString(ExpressionTree expression) {
    Type type = expression.types().getUniqueKnownType();
    return type != null && type.kind() == Type.Kind.STRING;
  }
}
