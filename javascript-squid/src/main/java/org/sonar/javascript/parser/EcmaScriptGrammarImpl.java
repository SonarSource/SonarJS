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
package org.sonar.javascript.parser;

import org.sonar.javascript.api.EcmaScriptGrammar;

import static com.sonar.sslr.api.GenericTokenType.EOF;
import static com.sonar.sslr.api.GenericTokenType.IDENTIFIER;
import static com.sonar.sslr.api.GenericTokenType.LITERAL;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.and;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.o2n;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.one2n;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.opt;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.or;
import static org.sonar.javascript.api.EcmaScriptKeyword.BREAK;
import static org.sonar.javascript.api.EcmaScriptKeyword.CASE;
import static org.sonar.javascript.api.EcmaScriptKeyword.CONTINUE;
import static org.sonar.javascript.api.EcmaScriptKeyword.DEBUGGER;
import static org.sonar.javascript.api.EcmaScriptKeyword.DEFAULT;
import static org.sonar.javascript.api.EcmaScriptKeyword.DELETE;
import static org.sonar.javascript.api.EcmaScriptKeyword.DO;
import static org.sonar.javascript.api.EcmaScriptKeyword.ELSE;
import static org.sonar.javascript.api.EcmaScriptKeyword.FALSE;
import static org.sonar.javascript.api.EcmaScriptKeyword.FINALLY;
import static org.sonar.javascript.api.EcmaScriptKeyword.FOR;
import static org.sonar.javascript.api.EcmaScriptKeyword.FUNCTION;
import static org.sonar.javascript.api.EcmaScriptKeyword.IF;
import static org.sonar.javascript.api.EcmaScriptKeyword.IN;
import static org.sonar.javascript.api.EcmaScriptKeyword.INSTANCEOF;
import static org.sonar.javascript.api.EcmaScriptKeyword.NEW;
import static org.sonar.javascript.api.EcmaScriptKeyword.NULL;
import static org.sonar.javascript.api.EcmaScriptKeyword.RETURN;
import static org.sonar.javascript.api.EcmaScriptKeyword.SWITCH;
import static org.sonar.javascript.api.EcmaScriptKeyword.THIS;
import static org.sonar.javascript.api.EcmaScriptKeyword.THROW;
import static org.sonar.javascript.api.EcmaScriptKeyword.TRUE;
import static org.sonar.javascript.api.EcmaScriptKeyword.TRY;
import static org.sonar.javascript.api.EcmaScriptKeyword.TYPEOF;
import static org.sonar.javascript.api.EcmaScriptKeyword.VAR;
import static org.sonar.javascript.api.EcmaScriptKeyword.VOID;
import static org.sonar.javascript.api.EcmaScriptKeyword.WHILE;
import static org.sonar.javascript.api.EcmaScriptKeyword.WITH;
import static org.sonar.javascript.api.EcmaScriptPunctuator.AND;
import static org.sonar.javascript.api.EcmaScriptPunctuator.ANDAND;
import static org.sonar.javascript.api.EcmaScriptPunctuator.AND_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.BANG;
import static org.sonar.javascript.api.EcmaScriptPunctuator.COLON;
import static org.sonar.javascript.api.EcmaScriptPunctuator.COMMA;
import static org.sonar.javascript.api.EcmaScriptPunctuator.DEC;
import static org.sonar.javascript.api.EcmaScriptPunctuator.DIV;
import static org.sonar.javascript.api.EcmaScriptPunctuator.DIV_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.DOT;
import static org.sonar.javascript.api.EcmaScriptPunctuator.EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.EQUAL;
import static org.sonar.javascript.api.EcmaScriptPunctuator.EQUAL2;
import static org.sonar.javascript.api.EcmaScriptPunctuator.GE;
import static org.sonar.javascript.api.EcmaScriptPunctuator.GT;
import static org.sonar.javascript.api.EcmaScriptPunctuator.INC;
import static org.sonar.javascript.api.EcmaScriptPunctuator.LBRACKET;
import static org.sonar.javascript.api.EcmaScriptPunctuator.LCURLYBRACE;
import static org.sonar.javascript.api.EcmaScriptPunctuator.LE;
import static org.sonar.javascript.api.EcmaScriptPunctuator.LPARENTHESIS;
import static org.sonar.javascript.api.EcmaScriptPunctuator.LT;
import static org.sonar.javascript.api.EcmaScriptPunctuator.MINUS;
import static org.sonar.javascript.api.EcmaScriptPunctuator.MINUS_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.MOD;
import static org.sonar.javascript.api.EcmaScriptPunctuator.MOD_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.NOTEQUAL;
import static org.sonar.javascript.api.EcmaScriptPunctuator.NOTEQUAL2;
import static org.sonar.javascript.api.EcmaScriptPunctuator.OR;
import static org.sonar.javascript.api.EcmaScriptPunctuator.OROR;
import static org.sonar.javascript.api.EcmaScriptPunctuator.OR_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.PLUS;
import static org.sonar.javascript.api.EcmaScriptPunctuator.PLUS_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.QUERY;
import static org.sonar.javascript.api.EcmaScriptPunctuator.RBRACKET;
import static org.sonar.javascript.api.EcmaScriptPunctuator.RCURLYBRACE;
import static org.sonar.javascript.api.EcmaScriptPunctuator.RPARENTHESIS;
import static org.sonar.javascript.api.EcmaScriptPunctuator.SEMI;
import static org.sonar.javascript.api.EcmaScriptPunctuator.SL;
import static org.sonar.javascript.api.EcmaScriptPunctuator.SL_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.SR;
import static org.sonar.javascript.api.EcmaScriptPunctuator.SR2;
import static org.sonar.javascript.api.EcmaScriptPunctuator.SR_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.SR_EQU2;
import static org.sonar.javascript.api.EcmaScriptPunctuator.STAR;
import static org.sonar.javascript.api.EcmaScriptPunctuator.STAR_EQU;
import static org.sonar.javascript.api.EcmaScriptPunctuator.TILDA;
import static org.sonar.javascript.api.EcmaScriptPunctuator.XOR;
import static org.sonar.javascript.api.EcmaScriptPunctuator.XOR_EQU;
import static org.sonar.javascript.api.EcmaScriptTokenType.FLOATING_LITERAL;
import static org.sonar.javascript.api.EcmaScriptTokenType.INTEGER_LITERAL;
import static org.sonar.javascript.api.EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL;

/**
 * Grammar for ECMAScript.
 * Based on <a href="http://www.ecma-international.org/publications/standards/Ecma-262.htm">ECMA-262</a>
 * edition 5.1 (June 2011).
 */
public class EcmaScriptGrammarImpl extends EcmaScriptGrammar {

  public EcmaScriptGrammarImpl() {
    identifierName.is(IDENTIFIER);

    literal.is(or(
        nullLiteral,
        booleanLiteral,
        numericLiteral,
        stringLiteral,
        regularExpressionLiteral));
    nullLiteral.is(NULL);
    booleanLiteral.is(or(
        TRUE,
        FALSE));
    // TODO verify
    numericLiteral.is(or(
        FLOATING_LITERAL,
        INTEGER_LITERAL));
    stringLiteral.is(LITERAL);
    regularExpressionLiteral.is(REGULAR_EXPRESSION_LITERAL);

    expressions();
    statements();
    functionsAndPrograms();
  }

  /**
   * A.3 Expressions
   */
  private void expressions() {
    primaryExpression.is(or(
        THIS,
        IDENTIFIER,
        literal,
        arrayLiteral,
        objectLiteral,
        and(LPARENTHESIS, expression, RPARENTHESIS)));
    arrayLiteral.is(or(
        and(LBRACKET, opt(elision), RBRACKET),
        and(LBRACKET, elementList, RBRACKET),
        and(LBRACKET, elementList, COMMA, opt(elision), RBRACKET)));
    elementList.is(and(opt(elision), assignmentExpression), o2n(COMMA, opt(elision), assignmentExpression));
    elision.is(one2n(COMMA));
    objectLiteral.is(or(
        and(LCURLYBRACE, RCURLYBRACE),
        and(LCURLYBRACE, propertyNameAndValueList, RCURLYBRACE),
        and(LCURLYBRACE, propertyNameAndValueList, COMMA, RCURLYBRACE)));
    propertyNameAndValueList.is(propertyAssignment, o2n(COMMA, propertyAssignment));
    propertyAssignment.is(or(
        and(propertyName, COLON, assignmentExpression),
        and("get", propertyName, LPARENTHESIS, RPARENTHESIS, LCURLYBRACE, functionBody, RCURLYBRACE),
        and("set", propertyName, LPARENTHESIS, propertySetParameterList, RPARENTHESIS, LCURLYBRACE, functionBody, RCURLYBRACE)));
    propertyName.is(or(
        identifierName,
        stringLiteral,
        numericLiteral));
    propertySetParameterList.is(IDENTIFIER);
    memberExpression.is(
        or(
            primaryExpression,
            functionExpression,
            memberExpression_),
        o2n(or(
            and(LBRACKET, expression, RBRACKET),
            and(DOT, identifierName))));
    memberExpression_.is(NEW, memberExpression, arguments);
    newExpression.is(or(
        memberExpression,
        and(NEW, newExpression)));
    callExpression.is(
        and(memberExpression, arguments),
        o2n(or(
            arguments,
            and(LBRACKET, expression, RBRACKET),
            and(DOT, identifierName))));
    arguments.is(or(
        and(LPARENTHESIS, argumentList, RPARENTHESIS),
        and(LPARENTHESIS, RPARENTHESIS)));
    argumentList.is(assignmentExpression, o2n(COMMA, assignmentExpression));
    leftHandSideExpression.is(or(
        callExpression,
        newExpression));
    postfixExpression.is(or(
        leftHandSideExpression,
        and(leftHandSideExpression, /* no line terminator here */INC),
        and(leftHandSideExpression, /* no line terminator here */DEC)));
    unaryExpression.is(or(
        postfixExpression,
        and(DELETE, unaryExpression),
        and(VOID, unaryExpression),
        and(TYPEOF, unaryExpression),
        and(INC, unaryExpression),
        and(DEC, unaryExpression),
        and(PLUS, unaryExpression),
        and(MINUS, unaryExpression),
        and(TILDA, unaryExpression),
        and(BANG, unaryExpression)));
    multiplicativeExpression.is(unaryExpression, opt(or(STAR, DIV, MOD), multiplicativeExpression));
    additiveExpression.is(multiplicativeExpression, opt(or(PLUS, MINUS), additiveExpression));
    shiftExpression.is(additiveExpression, opt(or(SL, SR, SR2), shiftExpression));

    relationalExpression.is(shiftExpression, opt(or(LT, GT, LE, GE, INSTANCEOF, IN), relationalExpression));
    relationalExpressionNoIn.is(shiftExpression, opt(or(LT, GT, LE, GE, INSTANCEOF), relationalExpression));

    equalityExpression.is(relationalExpression, opt(or(EQUAL, NOTEQUAL, EQUAL2, NOTEQUAL2), equalityExpression));
    equalityExpressionNoIn.is(relationalExpressionNoIn, opt(or(EQUAL, NOTEQUAL, EQUAL2, NOTEQUAL2), equalityExpressionNoIn));

    bitwiseAndExpression.is(equalityExpression, opt(AND, bitwiseAndExpression));
    bitwiseAndExpressionNoIn.is(equalityExpressionNoIn, opt(AND, bitwiseAndExpressionNoIn));

    bitwiseXorExpression.is(bitwiseAndExpression, opt(XOR, bitwiseXorExpression));
    bitwiseXorExpressionNoIn.is(bitwiseAndExpressionNoIn, opt(XOR, bitwiseXorExpressionNoIn));

    bitwiseOrExpression.is(bitwiseXorExpression, opt(OR, bitwiseOrExpression));
    bitwiseOrExpressionNoIn.is(bitwiseXorExpressionNoIn, opt(OR, bitwiseOrExpressionNoIn));

    logicalAndExpression.is(bitwiseOrExpression, opt(ANDAND, logicalAndExpression));
    logicalAndExpressionNoIn.is(bitwiseOrExpressionNoIn, opt(ANDAND, logicalAndExpressionNoIn));

    logicalOrExpression.is(logicalAndExpression, opt(OROR, logicalOrExpression));
    logicalOrExpressionNoIn.is(logicalAndExpressionNoIn, opt(OROR, logicalOrExpressionNoIn));

    conditionalExpression.is(logicalOrExpression, opt(QUERY, assignmentExpression, COLON, assignmentExpression));
    conditionalExpressionNoIn.is(logicalOrExpressionNoIn, opt(QUERY, assignmentExpression, COLON, assignmentExpressionNoIn));

    assignmentExpression.is(or(
        and(leftHandSideExpression, EQU, assignmentExpression),
        and(leftHandSideExpression, assignmentOperator, assignmentExpression),
        conditionalExpression));
    assignmentExpressionNoIn.is(or(
        and(leftHandSideExpression, EQU, assignmentExpressionNoIn),
        and(leftHandSideExpression, assignmentOperator, assignmentExpressionNoIn),
        conditionalExpressionNoIn));

    assignmentOperator.is(or(
        STAR_EQU,
        DIV_EQU,
        MOD_EQU,
        PLUS_EQU,
        MINUS_EQU,
        SL_EQU,
        SR_EQU,
        SR_EQU2,
        AND_EQU,
        XOR_EQU,
        OR_EQU));

    expression.is(assignmentExpression, o2n(COMMA, assignmentExpression));
    expressionNoIn.is(assignmentExpressionNoIn, o2n(COMMA, assignmentExpressionNoIn));
  }

  /**
   * A.4 Statement
   */
  private void statements() {
    statement.is(or(
        block,
        variableStatement,
        emptyStatement,
        expressionStatement,
        ifStatement,
        iterationStatement,
        continueStatement,
        breakStatement,
        returnStatement,
        withStatement,
        labeledStatement,
        switchStatement,
        throwStatement,
        tryStatement,
        debuggerStatement));
    block.is(LCURLYBRACE, opt(statementList), RCURLYBRACE);
    statementList.is(one2n(statement));
    variableStatement.is(VAR, variableDeclarationList, SEMI);
    variableDeclarationList.is(variableDeclaration, o2n(COMMA, variableDeclaration));
    variableDeclarationListNoIn.is(variableDeclarationNoIn, o2n(COMMA, variableDeclarationNoIn));
    variableDeclaration.is(IDENTIFIER, opt(initialiser));
    variableDeclarationNoIn.is(IDENTIFIER, opt(initialiserNoIn));
    initialiser.is(EQU, assignmentExpression);
    initialiserNoIn.is(EQU, assignmentExpressionNoIn);
    emptyStatement.is(SEMI);
    // TODO verify
    expressionStatement.is(expression, SEMI);
    ifStatement.is(or(
        and(IF, LPARENTHESIS, expression, RPARENTHESIS, statement, ELSE, statement),
        and(IF, LPARENTHESIS, expression, RPARENTHESIS, statement)));
    iterationStatement.is(or(
        and(DO, statement, WHILE, LPARENTHESIS, expression, RPARENTHESIS, SEMI),
        and(WHILE, LPARENTHESIS, expression, RPARENTHESIS, statement),
        and(FOR, LPARENTHESIS, opt(expressionNoIn), SEMI, opt(expression), SEMI, opt(expression), RPARENTHESIS, statement),
        and(FOR, LPARENTHESIS, VAR, variableDeclarationListNoIn, SEMI, opt(expression), SEMI, opt(expression), RPARENTHESIS, statement),
        and(FOR, LPARENTHESIS, leftHandSideExpression, IN, expression, RPARENTHESIS, statement),
        and(FOR, LPARENTHESIS, VAR, variableDeclarationListNoIn, IN, expression, RPARENTHESIS, statement)));
    continueStatement.is(or(
        and(CONTINUE, SEMI),
        and(CONTINUE, /* TODO no line terminator here */IDENTIFIER, SEMI)));
    breakStatement.is(or(
        and(BREAK, SEMI),
        and(BREAK, /* TODO no line terminator here */IDENTIFIER, SEMI)));
    returnStatement.is(or(
        and(RETURN, SEMI),
        // TODO check specs
        and(RETURN, expression, SEMI),
        and(RETURN, /* TODO no line terminator here */IDENTIFIER, SEMI)));
    withStatement.is(WITH, LPARENTHESIS, expression, RPARENTHESIS, statement);
    switchStatement.is(SWITCH, LPARENTHESIS, expression, RPARENTHESIS, caseBlock);
    caseBlock.is(or(
        and(LCURLYBRACE, opt(caseClauses), RCURLYBRACE),
        and(LCURLYBRACE, opt(caseClauses), defaultClause, opt(caseClauses), RCURLYBRACE)));
    caseClauses.is(one2n(caseClause));
    caseClause.is(CASE, expression, COLON, opt(statementList));
    defaultClause.is(DEFAULT, COLON, opt(statementList));
    labeledStatement.is(IDENTIFIER, COLON, statement);
    throwStatement.is(THROW, /* TODO no line terminator here */expression, SEMI);
    tryStatement.is(or(
        and(TRY, block, catch_),
        and(TRY, block, finally_),
        and(TRY, block, catch_, finally_)));
    catch_.is(CASE, LPARENTHESIS, IDENTIFIER, RPARENTHESIS, block);
    finally_.is(FINALLY, block);
    debuggerStatement.is(DEBUGGER, SEMI);
  }

  /**
   * A.5 Functions and Programs
   */
  private void functionsAndPrograms() {
    functionDeclaration.is(FUNCTION, IDENTIFIER, LPARENTHESIS, opt(formalParameterList), RPARENTHESIS, LCURLYBRACE, functionBody, RCURLYBRACE);
    functionExpression.is(FUNCTION, opt(IDENTIFIER), LPARENTHESIS, opt(formalParameterList), RPARENTHESIS, LCURLYBRACE, functionBody, RCURLYBRACE);
    formalParameterList.is(IDENTIFIER, o2n(COMMA, IDENTIFIER));
    functionBody.is(opt(sourceElements));
    program.is(opt(sourceElements), EOF);
    sourceElements.is(one2n(sourceElement));
    sourceElement.is(or(
        statement,
        functionDeclaration));
  }

}
