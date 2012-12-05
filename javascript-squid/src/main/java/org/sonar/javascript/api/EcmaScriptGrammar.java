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

import com.sonar.sslr.api.Grammar;
import com.sonar.sslr.api.Rule;

public class EcmaScriptGrammar extends Grammar {

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
