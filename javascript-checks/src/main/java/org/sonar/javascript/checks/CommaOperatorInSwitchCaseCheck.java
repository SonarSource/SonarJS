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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S3616",
  name = "Comma operators should not be used in switch cases",
  priority = Priority.CRITICAL,
  tags = {Tags.BUG})
@ActivatedByDefault
@SqaleConstantRemediation("5min")
public class CommaOperatorInSwitchCaseCheck extends DoubleDispatchVisitorCheck {
  
  private static final String MESSAGE = "Explicitly specify %d separate cases that fall through; currently this case clause only works for \"%s\".";
  
  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    ExpressionTree expression = tree.expression();
    if (expression.is(Kind.COMMA_OPERATOR)) {
      int nbCommas = getNumberOfCommas(expression);
      String lastCase = ((BinaryExpressionTree)expression).rightOperand().toString();
      String msg = String.format(MESSAGE, nbCommas + 1, lastCase);
      addIssue(expression, msg);
    }
    
    super.visitCaseClause(tree);
  }
  
  /**
   * Gets the number of "," characters in the specified expression.
   * <p>
   * Example 1: expression 10 (as in "case 10:") returns 0.
   * <p>
   * Example 2: expression 10,11,12,13 (as in "case 10,11,12,13:") returns 3.
   */
  private int getNumberOfCommas(ExpressionTree expression) {
    int nbCommas = 0;
    if (expression.is(Kind.COMMA_OPERATOR)) {
      BinaryExpressionTree binaryExpression = (BinaryExpressionTree) expression;
      nbCommas = getNumberOfCommas(binaryExpression.leftOperand()) + 1;
    }
    return nbCommas;
  }

}
