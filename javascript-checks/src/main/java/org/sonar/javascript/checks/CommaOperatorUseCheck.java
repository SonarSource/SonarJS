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
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.javascript.model.interfaces.expression.BinaryExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;
import org.sonar.squidbridge.annotations.Tags;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

import com.sonar.sslr.api.AstNode;

@Rule(
  key = "S878",
  priority = Priority.MAJOR,
  tags = {Tags.MISRA})
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MAJOR)
public class CommaOperatorUseCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(Kind.COMMA_OPERATOR);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (isInCommaExpression(astNode) || isInitOrIncrementOfForLoop(astNode)) {
      return;
    }

    BinaryExpressionTree expr = (BinaryExpressionTree) astNode;
    String message;
    if (expr.leftOperand().is(Kind.COMMA_OPERATOR)) {
      message = "Remove use of all comma operators in this expression.";
    } else {
      message = "Remove use of this comma operator.";
    }

    while (expr.leftOperand().is(Kind.COMMA_OPERATOR)) {
      expr = (BinaryExpressionTree) expr.leftOperand();
    }
    SyntaxToken operator = expr.operator();

    getContext().createLineViolation(this, message, (InternalSyntaxToken) operator);
  }

  public static boolean isInCommaExpression(AstNode expr) {
    return expr.getParent().is(Kind.COMMA_OPERATOR);
  }

  public static boolean isInitOrIncrementOfForLoop(AstNode expr) {
    return expr.getParent().is(Kind.FOR_STATEMENT)
      && (expr.getPreviousAstNode().is(EcmaScriptPunctuator.LPARENTHESIS) || expr.getNextAstNode().is(EcmaScriptPunctuator.RPARENTHESIS));
  }

}
