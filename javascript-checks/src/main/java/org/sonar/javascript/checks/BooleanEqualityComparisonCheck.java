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
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "S1125",
  priority = Priority.MINOR,
  tags = {Tags.CLUMSY})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MINOR)
public class BooleanEqualityComparisonCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(CheckUtils.equalityExpressionArray());
    subscribeTo(Kind.LOGICAL_COMPLEMENT);
    subscribeTo(
      Kind.CONDITIONAL_AND,
      Kind.CONDITIONAL_OR);
  }

  @Override
  public void visitNode(AstNode astNode) {
    AstNode boolLiteral = getBooleanLiteralFromExpresion(astNode);

    if (boolLiteral != null) {
      getContext().createLineViolation(this, "Remove the literal \"" + boolLiteral.getTokenOriginalValue() + "\" boolean value.", boolLiteral);
    }
  }

  private static AstNode getBooleanLiteralFromExpresion(AstNode expression) {
    if (expression.is(Kind.LOGICAL_COMPLEMENT)) {
      return getBooleanLiteralFromUnaryExpression(expression);
    }

    BinaryExpressionTree binaryExpr = (BinaryExpressionTree) expression;

    // e.g x == y == false
    if (expression.getParent().is(CheckUtils.equalityExpressionArray())) {
      return null;
    }

    AstNode leftExpr = (AstNode) binaryExpr.leftOperand();
    AstNode rightExpr = (AstNode) binaryExpr.rightOperand();

    if (isBooleanLiteral(leftExpr)) {
      return leftExpr;
    } else if (isBooleanLiteral(rightExpr)) {
      return rightExpr;
    } else {
      return null;
    }
  }

  private static AstNode getBooleanLiteralFromUnaryExpression(AstNode unaryExpression) {
    AstNode boolLiteral = null;

    if (unaryExpression.getFirstChild().is(EcmaScriptPunctuator.BANG)) {
      AstNode expr = unaryExpression.getLastChild();

      if (isBooleanLiteral(expr)) {
        boolLiteral = expr;
      }
    }
    return boolLiteral;
  }

  public static boolean isBooleanLiteral(AstNode node) {
    return EcmaScriptKeyword.FALSE.getValue().equals(node.getTokenValue())
      || EcmaScriptKeyword.TRUE.getValue().equals(node.getTokenValue());
  }

}
