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
import com.sonar.sslr.squid.checks.SquidCheck;
import org.sonar.check.BelongsToProfile;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.parser.EcmaScriptGrammar;
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
    if (astNode.is(EcmaScriptGrammar.UNARY_EXPRESSION)) {
      checkUnaryExpression(astNode);
    } else {
      checkBinaryExpr(astNode);
    }
  }

  public void checkBinaryExpr(AstNode expr) {
    if (expr.getNumberOfChildren() == 3 && hasBooleanLiteral(expr)) {
      String operator = expr.getFirstChild(
        EcmaScriptPunctuator.EQUAL,
        EcmaScriptPunctuator.NOTEQUAL,
        EcmaScriptPunctuator.EQUAL2,
        EcmaScriptPunctuator.NOTEQUAL2,
        EcmaScriptPunctuator.ANDAND,
        EcmaScriptPunctuator.OROR)
        .getTokenValue();

      reportIssue(expr, operator);
    }
  }

  public static boolean hasBooleanLiteral(AstNode expr) {
    return isBooleanLiteral(expr.getFirstChild())
      || isBooleanLiteral(expr.getLastChild());
  }

  public void checkUnaryExpression(AstNode unaryExpr) {
    if (unaryExpr.getFirstChild(EcmaScriptPunctuator.BANG) != null && isBooleanLiteral(unaryExpr.getLastChild())) {
      reportIssue(unaryExpr, EcmaScriptPunctuator.BANG.getValue());
    }
  }

  public static boolean isBooleanLiteral(AstNode node) {
    return EcmaScriptKeyword.FALSE.getValue().equals(node.getTokenValue())
      || EcmaScriptKeyword.TRUE.getValue().equals(node.getTokenValue());
  }

  public void reportIssue(AstNode node, String operator) {
    getContext().createLineViolation(this, "Remove the useless \"{0}\" operator.", node, operator);

  }
}
