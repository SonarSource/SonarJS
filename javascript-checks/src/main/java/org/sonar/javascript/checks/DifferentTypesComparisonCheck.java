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

import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3403",
  name = "The identity operator (\"===\") should not be used with dissimilar types",
  priority = Priority.CRITICAL,
  tags = Tags.BUG)
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class DifferentTypesComparisonCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this \"%s\" check; it will always be false. Did you mean to use \"%s\"?";

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    super.visitBinaryExpression(tree);

    if (tree.is(Kind.STRICT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO)) {
      Type leftOperandType = tree.leftOperand().types().getUniqueKnownType();
      Type rightOperandType = tree.rightOperand().types().getUniqueKnownType();

      if (leftOperandType != null && rightOperandType != null && leftOperandType.kind() != rightOperandType.kind()) {
        boolean bothObjects = isObjectType(leftOperandType) && isObjectType(rightOperandType);
        if (!bothObjects) {
          raiseIssue(tree);
        }
      }
    }
  }

  private static boolean isObjectType(Type type) {
    Type.Kind kind = type.kind();
    return kind != Type.Kind.NUMBER && kind != Type.Kind.STRING && kind != Type.Kind.BOOLEAN;
  }

  private void raiseIssue(BinaryExpressionTree tree) {
    String operator = tree.operator().text();
    String message = String.format(MESSAGE, operator, operator.substring(0, operator.length() - 1));

    addIssue(tree.operator(), message)
      .secondary(tree.leftOperand())
      .secondary(tree.rightOperand());
  }
}
