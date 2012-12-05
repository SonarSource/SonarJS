/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.javascript.api;

import com.sonar.sslr.api.Rule;
import org.sonar.sslr.parser.LexerlessGrammar;

public class EcmaScriptGrammar extends LexerlessGrammar {

  protected Rule eof;
  public Rule eos;
  public Rule eosNoLb;

  public Rule identifierName;

  public Rule condition;

  // A.1 Lexical

  public Rule literal;
  public Rule nullLiteral;
  public Rule booleanLiteral;
  public Rule stringLiteral;
  public Rule regularExpressionLiteral;

  protected Rule numericLiteral;
  protected Rule identifier;

  protected Rule keyword;
  protected Rule letterOrDigit;
  protected Rule spacing;

  // Reserved words

  protected Rule nullKeyword;
  protected Rule trueKeyword;
  protected Rule falseKeyword;

  // Keywords

  protected Rule breakKeyword;
  protected Rule caseKeyword;
  protected Rule catchKeyword;
  protected Rule continueKeyword;
  protected Rule debuggerKeyword;
  protected Rule defaultKeyword;
  protected Rule deleteKeyword;
  protected Rule doKeyword;
  protected Rule elseKeyword;
  protected Rule finallyKeyword;
  protected Rule forKeyword;
  protected Rule functionKeyword;
  protected Rule ifKeyword;
  protected Rule inKeyword;
  protected Rule instanceofKeyword;
  protected Rule newKeyword;
  protected Rule returnKeyword;
  protected Rule switchKeyword;
  protected Rule thisKeyword;
  protected Rule throwKeyword;
  protected Rule tryKeyword;
  protected Rule typeofKeyword;
  protected Rule varKeyword;
  protected Rule voidKeyword;
  protected Rule whileKeyword;
  protected Rule withKeyword;

  // Future reserved words

  protected Rule classKeyword;
  protected Rule constKeyword;
  protected Rule enumKeyword;
  protected Rule exportKeyword;
  protected Rule extendsKeyword;
  protected Rule superKeyword;

  // Also considered to be "future reserved words" when parsing strict mode

  protected Rule implementsKeyword;
  protected Rule interfaceKeyword;
  protected Rule yieldKeyword;
  protected Rule letKeyword;
  protected Rule packageKeyword;
  protected Rule privateKeyword;
  protected Rule protectedKeyword;
  protected Rule publicKeyword;
  protected Rule staticKeyword;

  // Punctuators

  protected Rule lcurlybrace;
  protected Rule rcurlybrace;
  protected Rule lparenthesis;
  protected Rule rparenthesis;
  protected Rule lbracket;
  protected Rule rbracket;
  protected Rule dot;
  protected Rule semi;
  protected Rule comma;
  protected Rule lt;
  protected Rule gt;
  protected Rule le;
  protected Rule ge;
  protected Rule equal;
  protected Rule notequal;
  protected Rule equal2;
  protected Rule notequal2;
  protected Rule plus;
  protected Rule minus;
  protected Rule start;
  protected Rule mod;
  protected Rule div;
  protected Rule inc;
  protected Rule dec;
  protected Rule sl;
  protected Rule sr;
  protected Rule sr2;
  protected Rule and;
  protected Rule or;
  protected Rule xor;
  protected Rule bang;
  protected Rule tilda;
  protected Rule andand;
  protected Rule oror;
  protected Rule query;
  protected Rule colon;
  protected Rule equ;
  protected Rule plusEqu;
  protected Rule minusEqu;
  protected Rule divEqu;
  protected Rule starEqu;
  protected Rule modEqu;
  protected Rule slEqu;
  protected Rule srEqu;
  protected Rule srEqu2;
  protected Rule andEqu;
  protected Rule orEqu;
  protected Rule xorEqu;

  // A.3 Expressions

  public Rule primaryExpression;
  public Rule arrayLiteral;
  public Rule objectLiteral;
  public Rule propertyAssignment;
  public Rule propertyName;
  public Rule propertySetParameterList;
  public Rule memberExpression;
  public Rule newExpression;
  public Rule callExpression;
  public Rule arguments;
  public Rule leftHandSideExpression;
  public Rule postfixExpression;
  public Rule unaryExpression;
  public Rule multiplicativeExpression;
  public Rule additiveExpression;
  public Rule shiftExpression;
  public Rule relationalExpression;
  public Rule relationalExpressionNoIn;
  public Rule equalityExpression;
  public Rule equalityExpressionNoIn;
  public Rule bitwiseAndExpression;
  public Rule bitwiseAndExpressionNoIn;
  public Rule bitwiseXorExpression;
  public Rule bitwiseXorExpressionNoIn;
  public Rule bitwiseOrExpression;
  public Rule bitwiseOrExpressionNoIn;
  public Rule logicalAndExpression;
  public Rule logicalAndExpressionNoIn;
  public Rule logicalOrExpression;
  public Rule logicalOrExpressionNoIn;
  public Rule conditionalExpression;
  public Rule conditionalExpressionNoIn;
  public Rule assignmentExpression;
  public Rule assignmentExpressionNoIn;
  public Rule assignmentOperator;
  public Rule expression;
  public Rule expressionNoIn;

  // A.4 Statements

  public Rule statement;
  public Rule block;
  public Rule statementList;
  public Rule variableStatement;
  public Rule variableDeclarationList;
  public Rule variableDeclarationListNoIn;
  public Rule variableDeclaration;
  public Rule variableDeclarationNoIn;
  public Rule initialiser;
  public Rule initialiserNoIn;
  public Rule emptyStatement;
  public Rule expressionStatement;
  public Rule ifStatement;
  public Rule elseClause;
  public Rule iterationStatement;
  public Rule doWhileStatement;
  public Rule whileStatement;
  public Rule forInStatement;
  public Rule forStatement;
  public Rule continueStatement;
  public Rule breakStatement;
  public Rule returnStatement;
  public Rule withStatement;
  public Rule switchStatement;
  public Rule caseBlock;
  public Rule caseClauses;
  public Rule caseClause;
  public Rule defaultClause;
  public Rule labelledStatement;
  public Rule throwStatement;
  public Rule tryStatement;
  public Rule catch_;
  public Rule finally_;
  public Rule debuggerStatement;

  // A.5 Functions and Programs

  public Rule functionDeclaration;
  public Rule functionExpression;
  public Rule formalParameterList;
  public Rule functionBody;
  public Rule program;
  public Rule sourceElements;
  public Rule sourceElement;

  @Override
  public Rule getRootRule() {
    return program;
  }

}
