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

import com.sonar.sslr.api.AstNode;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

@Rule(
  key = "S1125",
  priority = Priority.MINOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MINOR)
public class BooleanEqualityComparisonCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(
      EcmaScriptGrammar.UNARY_EXPRESSION,
      EcmaScriptGrammar.EQUALITY_EXPRESSION,
      EcmaScriptGrammar.LOGICAL_AND_EXPRESSION,
      EcmaScriptGrammar.LOGICAL_OR_EXPRESSION);
  }

  @Override
  public void visitNode(AstNode astNode) {
    AstNode boolLiteral = getBooleanLiteralFromExpresion(astNode);

    if (boolLiteral != null) {
      getContext().createLineViolation(this, "Remove the literal \"" + boolLiteral.getTokenOriginalValue() + "\" boolean value.", astNode);
    }
  }

  private static AstNode getBooleanLiteralFromExpresion(AstNode expression) {
    if (expression.is(EcmaScriptGrammar.UNARY_EXPRESSION)) {
      return getBooleanLiteralFromUnaryExpression(expression);
    // e.g x == y == false
    } else if (expression.getNumberOfChildren() != 3){
      return null;
    }

    AstNode leftExpr = expression.getFirstChild();
    AstNode rightExpr = expression.getLastChild();

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
