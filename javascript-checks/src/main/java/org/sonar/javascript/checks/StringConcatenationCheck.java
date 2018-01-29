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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableList.Builder;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3512")
public class StringConcatenationCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Convert this concatenation to the use of a template.";

  // with quote symbols
  private static final int MIN_LITERAL_LENGTH = 6;

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    Builder<ExpressionTree> operandListBuilder = ImmutableList.builder();
    checkBinaryExpression(tree, operandListBuilder);
    List<ExpressionTree> operandList = operandListBuilder.build().reverse();

    if (meetConditions(operandList)) {
      addIssue(tree, MESSAGE);
    }
  }

  /**
   * 1. More than 2 operands in concatenation expression.
   * 2. At least one string literal.
   * 3. At least half of the string literals are long.
   * 4. Case with 1 literal and 3 operands doesn't meet conditions
   * 5. Not too many non literal operands
   */
  private static boolean meetConditions(List<ExpressionTree> operandList) {
    int operandsNum = operandList.size();
    int literalsNum = stringLiteralsNumber(operandList);

    if (operandsNum > 2 && literalsNum > 0 && operandsNum != literalsNum) {
      int shortLiteralsNum = smallLiteralsNumber(operandList);

      boolean isOneLiteralThreeOperandsCase = operandsNum == 3 && literalsNum == 1;
      boolean atLeastHalfLongLiterals = shortLiteralsNum <= literalsNum / 2.;
      boolean notTooManyNonLiterals = literalsNum - (operandsNum - literalsNum) >= -1;

      return !isOneLiteralThreeOperandsCase && atLeastHalfLongLiterals && notTooManyNonLiterals;
    }

    return false;
  }

  private static int stringLiteralsNumber(List<ExpressionTree> operandList) {
    int literalsNum = 0;

    for (ExpressionTree operand : operandList) {
      if (operand.is(Kind.TEMPLATE_LITERAL, Kind.STRING_LITERAL)) {
        literalsNum++;
      }
    }

    return literalsNum;
  }

  private static int smallLiteralsNumber(List<ExpressionTree> operandList) {
    int shortLiteralsNum = 0;

    for (ExpressionTree operand : operandList) {
      if (operand.is(Kind.STRING_LITERAL) && ((LiteralTree) operand).value().length() < MIN_LITERAL_LENGTH) {
        shortLiteralsNum++;
      }
    }

    return shortLiteralsNum;
  }

  private void checkBinaryExpression(BinaryExpressionTree tree, Builder<ExpressionTree> operandListBuilder) {
    operandListBuilder.add(tree.rightOperand());
    scan(tree.rightOperand());

    if (tree.is(Kind.PLUS)) {

      if (tree.leftOperand().is(Kind.PLUS)) {
        checkBinaryExpression((BinaryExpressionTree) tree.leftOperand(), operandListBuilder);

      } else {
        operandListBuilder.add(tree.leftOperand());
        scan(tree.leftOperand());
      }

    } else {
      scan(tree.leftOperand());
    }
  }
}
