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
import org.sonar.javascript.parser.EcmaScriptGrammar;
import org.sonar.squidbridge.checks.SquidCheck;
import org.sonar.sslr.parser.LexerlessGrammar;

@Rule(
  key = "S1126",
  priority = Priority.MINOR)
@BelongsToProfile(title = CheckList.SONAR_WAY_PROFILE, priority = Priority.MINOR)
public class ReturnOfBooleanExpressionCheck extends SquidCheck<LexerlessGrammar> {

  @Override
  public void init() {
    subscribeTo(EcmaScriptGrammar.IF_STATEMENT);
  }

  @Override
  public void visitNode(AstNode astNode) {
    if (isNotIfElse(astNode) && hasElse(astNode)
      && returnsBoolean(getTrueStatement(astNode))
      && returnsBoolean(getFalseStatement(astNode))) {
      getContext().createLineViolation(this, "Replace this if-then-else statement by a single return statement.", astNode);
    }
  }

  public static AstNode getTrueStatement(AstNode ifStmt) {
    return ifStmt.getFirstChild(EcmaScriptGrammar.ELSE_CLAUSE).getFirstChild(EcmaScriptGrammar.STATEMENT);
  }

  public static AstNode getFalseStatement(AstNode ifStmt) {
    return ifStmt.getFirstChild(EcmaScriptGrammar.STATEMENT);
  }

  public static boolean isNotIfElse(AstNode ifStmt) {
    return !ifStmt.getParent().getParent().is(EcmaScriptGrammar.ELSE_CLAUSE);
  }

  public static boolean hasElse(AstNode ifStmt) {
    return ifStmt.hasDirectChildren(EcmaScriptGrammar.ELSE_CLAUSE);
  }

  public static boolean returnsBoolean(AstNode statement) {
    return isBlockReturningBooleanLiteral(statement) || isSimpleReturnBooleanLiteral(statement);
  }

  public static boolean isBlockReturningBooleanLiteral(AstNode statement) {
    AstNode block = statement.getFirstChild(EcmaScriptGrammar.BLOCK);
    if (block == null) {
      return false;
    }

    AstNode stmtList = block.getFirstChild(EcmaScriptGrammar.STATEMENT_LIST);
    return stmtList != null
      && stmtList.getChildren(EcmaScriptGrammar.STATEMENT).size() == 1
      && isSimpleReturnBooleanLiteral(stmtList.getFirstChild());
  }

  public static boolean isSimpleReturnBooleanLiteral(AstNode statement) {
    AstNode returnStmt = statement.getFirstChild(EcmaScriptGrammar.RETURN_STATEMENT);
    if (returnStmt == null) {
      return false;
    }

    AstNode expression = returnStmt.getFirstChild(EcmaScriptGrammar.EXPRESSION);

    return hasASingleToken(expression)
      && (EcmaScriptKeyword.TRUE.getValue().equals(expression.getTokenValue())
      || EcmaScriptKeyword.FALSE.getValue().equals(expression.getTokenValue()));
  }

  private static boolean hasASingleToken(AstNode expression) {
    return expression != null && expression.getFirstChild().getToken().equals(expression.getLastToken());
  }
}
