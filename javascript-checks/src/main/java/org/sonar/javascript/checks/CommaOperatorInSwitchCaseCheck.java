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

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3616")
public class CommaOperatorInSwitchCaseCheck extends DoubleDispatchVisitorCheck {
  
  private static final String MESSAGE = "Explicitly specify %d separate cases that fall through; currently this case clause only works for \"%s\".";
  
  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    ExpressionTree expression = tree.expression();

    if (expression.is(Kind.COMMA_OPERATOR)) {
      int nbCommas = getNumberOfCommas(expression);
      raiseIssue(expression, nbCommas + 1, ((BinaryExpressionTree) expression).rightOperand());
    }

    if (expression.is(Kind.CONDITIONAL_OR)) {
      List<ExpressionTree> expressionTrees = orExpressionOperands(expression);
      if (!expressionTrees.isEmpty()) {
        raiseIssue(expression, expressionTrees.size(), expressionTrees.get(0));
      }
    }
    
    super.visitCaseClause(tree);
  }

  private void raiseIssue(ExpressionTree expression, int operandsNumber, ExpressionTree expressionResult) {
    String lastCase = CheckUtils.asString(expressionResult);
    String msg = String.format(MESSAGE, operandsNumber, lastCase);
    addIssue(expression, msg);
  }
  
  /**
   * Gets the number of "," characters in the specified expression.
   * <p>
   * Example 1: expression 10 (as in "case 10:") returns 0.
   * <p>
   * Example 2: expression 10,11,12,13 (as in "case 10,11,12,13:") returns 3.
   */
  private static int getNumberOfCommas(ExpressionTree expression) {
    int nbCommas = 0;
    if (expression.is(Kind.COMMA_OPERATOR)) {
      BinaryExpressionTree binaryExpression = (BinaryExpressionTree) expression;
      nbCommas = getNumberOfCommas(binaryExpression.leftOperand()) + 1;
    }
    return nbCommas;
  }

  /**
   * Returns the list of "or" expression operands where all operands are literals
   * Returns empty list if at least one operand is not literal
   */
  private static List<ExpressionTree> orExpressionOperands(ExpressionTree expression) {
    if (expression.is(Kind.CONDITIONAL_OR)) {
      BinaryExpressionTree binaryExpression = (BinaryExpressionTree) expression;

      if (binaryExpression.rightOperand().is(KindSet.LITERAL_KINDS)) {
        List<ExpressionTree> expressionTrees = orExpressionOperands(binaryExpression.leftOperand());
        if (!expressionTrees.isEmpty()) {
          expressionTrees.add(binaryExpression.rightOperand());
          return expressionTrees;
        }
      }

    } else if (expression.is(KindSet.LITERAL_KINDS)) {
      return Lists.newArrayList(expression);

    }

    return ImmutableList.of();
  }

}
