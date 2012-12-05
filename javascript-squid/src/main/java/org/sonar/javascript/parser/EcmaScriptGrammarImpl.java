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

import com.sonar.sslr.impl.matcher.GrammarFunctions;
import org.sonar.javascript.api.EcmaScriptGrammar;

import static com.sonar.sslr.api.GenericTokenType.EOF;
import static com.sonar.sslr.api.GenericTokenType.IDENTIFIER;
import static com.sonar.sslr.api.GenericTokenType.LITERAL;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Predicate.next;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Predicate.not;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.and;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.firstOf;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.o2n;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.one2n;
import static com.sonar.sslr.impl.matcher.GrammarFunctions.Standard.opt;
import static org.sonar.javascript.api.EcmaScriptKeyword.BREAK;
import static org.sonar.javascript.api.EcmaScriptKeyword.CASE;
import static org.sonar.javascript.api.EcmaScriptKeyword.CATCH;
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
import static org.sonar.javascript.api.EcmaScriptTokenType.NUMERIC_LITERAL;
import static org.sonar.javascript.api.EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL;

/**
 * Grammar for ECMAScript.
 * Based on <a href="http://www.ecma-international.org/publications/standards/Ecma-262.htm">ECMA-262</a>
 * edition 5.1 (June 2011).
 */
public class EcmaScriptGrammarImpl extends EcmaScriptGrammar {

  public EcmaScriptGrammarImpl() {
    eos.is(firstOf(
        opt(SEMI),
        next(RCURLYBRACE),
        next(EOF)));
    eosNoLb.is(firstOf(
        opt(SEMI),
        next(RCURLYBRACE),
        next(EOF)));

    identifierName.is(IDENTIFIER);

    literal.is(firstOf(
        nullLiteral,
        booleanLiteral,
        NUMERIC_LITERAL,
        stringLiteral,
        regularExpressionLiteral));
    nullLiteral.is(NULL);
    booleanLiteral.is(firstOf(
        TRUE,
        FALSE));
    stringLiteral.is(LITERAL);
    regularExpressionLiteral.is(REGULAR_EXPRESSION_LITERAL);

    expressions();
    statements();
    functionsAndPrograms();

    GrammarFunctions.enableMemoizationOfMatchesForAllRules(this);
  }

  /**
   * A.3 Expressions
   */
  private void expressions() {
    primaryExpression.is(firstOf(
        THIS,
        IDENTIFIER,
        literal,
        arrayLiteral,
        objectLiteral,
        and(LPARENTHESIS, expression, RPARENTHESIS)));
    arrayLiteral.is(LBRACKET, o2n(firstOf(COMMA, assignmentExpression)), RBRACKET);
    objectLiteral.is(LCURLYBRACE, opt(propertyAssignment, o2n(COMMA, propertyAssignment), opt(COMMA)), RCURLYBRACE);
    propertyAssignment.is(firstOf(
        and(propertyName, COLON, assignmentExpression),
        and("get", propertyName, LPARENTHESIS, RPARENTHESIS, LCURLYBRACE, functionBody, RCURLYBRACE),
        and("set", propertyName, LPARENTHESIS, propertySetParameterList, RPARENTHESIS, LCURLYBRACE, functionBody, RCURLYBRACE)));
    propertyName.is(firstOf(
        identifierName,
        stringLiteral,
        NUMERIC_LITERAL));
    propertySetParameterList.is(IDENTIFIER);
    memberExpression.is(
        firstOf(
            primaryExpression,
            functionExpression,
            and(NEW, memberExpression, arguments)),
        o2n(firstOf(
            and(LBRACKET, expression, RBRACKET),
            and(DOT, identifierName))));
    newExpression.is(firstOf(
        memberExpression,
        and(NEW, newExpression)));
    callExpression.is(
        and(memberExpression, arguments),
        o2n(firstOf(
            arguments,
            and(LBRACKET, expression, RBRACKET),
            and(DOT, identifierName))));
    arguments.is(LPARENTHESIS, opt(assignmentExpression, o2n(COMMA, assignmentExpression)), RPARENTHESIS);
    leftHandSideExpression.is(firstOf(
        callExpression,
        newExpression));
    postfixExpression.is(leftHandSideExpression, opt(/* no line terminator here */firstOf(INC, DEC)));
    unaryExpression.is(firstOf(
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
    multiplicativeExpression.is(unaryExpression, o2n(firstOf(STAR, DIV, MOD), unaryExpression)).skipIfOneChild();
    additiveExpression.is(multiplicativeExpression, o2n(firstOf(PLUS, MINUS), multiplicativeExpression)).skipIfOneChild();
    shiftExpression.is(additiveExpression, o2n(firstOf(SL, SR, SR2), additiveExpression)).skipIfOneChild();

    relationalExpression.is(shiftExpression, o2n(firstOf(LT, GT, LE, GE, INSTANCEOF, IN), shiftExpression)).skipIfOneChild();
    relationalExpressionNoIn.is(shiftExpression, o2n(firstOf(LT, GT, LE, GE, INSTANCEOF), shiftExpression)).skipIfOneChild();

    equalityExpression.is(relationalExpression, o2n(firstOf(EQUAL, NOTEQUAL, EQUAL2, NOTEQUAL2), relationalExpression)).skipIfOneChild();
    equalityExpressionNoIn.is(relationalExpressionNoIn, o2n(firstOf(EQUAL, NOTEQUAL, EQUAL2, NOTEQUAL2), relationalExpressionNoIn)).skipIfOneChild();

    bitwiseAndExpression.is(equalityExpression, o2n(AND, equalityExpression)).skipIfOneChild();
    bitwiseAndExpressionNoIn.is(equalityExpressionNoIn, o2n(AND, equalityExpressionNoIn)).skipIfOneChild();

    bitwiseXorExpression.is(bitwiseAndExpression, o2n(XOR, bitwiseAndExpression)).skipIfOneChild();
    bitwiseXorExpressionNoIn.is(bitwiseAndExpressionNoIn, o2n(XOR, bitwiseAndExpressionNoIn)).skipIfOneChild();

    bitwiseOrExpression.is(bitwiseXorExpression, o2n(OR, bitwiseXorExpression)).skipIfOneChild();
    bitwiseOrExpressionNoIn.is(bitwiseXorExpressionNoIn, o2n(OR, bitwiseXorExpressionNoIn)).skipIfOneChild();

    logicalAndExpression.is(bitwiseOrExpression, o2n(ANDAND, bitwiseOrExpression)).skipIfOneChild();
    logicalAndExpressionNoIn.is(bitwiseOrExpressionNoIn, o2n(ANDAND, bitwiseOrExpressionNoIn)).skipIfOneChild();

    logicalOrExpression.is(logicalAndExpression, o2n(OROR, logicalAndExpression)).skipIfOneChild();
    logicalOrExpressionNoIn.is(logicalAndExpressionNoIn, o2n(OROR, logicalAndExpressionNoIn)).skipIfOneChild();

    conditionalExpression.is(logicalOrExpression, opt(QUERY, assignmentExpression, COLON, assignmentExpression)).skipIfOneChild();
    conditionalExpressionNoIn.is(logicalOrExpressionNoIn, opt(QUERY, assignmentExpression, COLON, assignmentExpressionNoIn)).skipIfOneChild();

    assignmentExpression.is(firstOf(
        and(leftHandSideExpression, assignmentOperator, assignmentExpression),
        conditionalExpression)).skipIfOneChild();
    assignmentExpressionNoIn.is(firstOf(
        and(leftHandSideExpression, assignmentOperator, assignmentExpressionNoIn),
        conditionalExpressionNoIn)).skipIfOneChild();

    assignmentOperator.is(firstOf(
        EQU,
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
    statement.is(firstOf(
        block,
        variableStatement,
        emptyStatement,
        labelledStatement,
        expressionStatement,
        ifStatement,
        iterationStatement,
        continueStatement,
        breakStatement,
        returnStatement,
        withStatement,
        switchStatement,
        throwStatement,
        tryStatement,
        debuggerStatement));
    block.is(LCURLYBRACE, opt(statementList), RCURLYBRACE);
    statementList.is(one2n(firstOf(statement, permissive(functionDeclaration))));
    variableStatement.is(VAR, variableDeclarationList, eos);
    variableDeclarationList.is(variableDeclaration, o2n(COMMA, variableDeclaration));
    variableDeclarationListNoIn.is(variableDeclarationNoIn, o2n(COMMA, variableDeclarationNoIn));
    variableDeclaration.is(IDENTIFIER, opt(initialiser));
    variableDeclarationNoIn.is(IDENTIFIER, opt(initialiserNoIn));
    initialiser.is(EQU, assignmentExpression);
    initialiserNoIn.is(EQU, assignmentExpressionNoIn);
    emptyStatement.is(SEMI);
    expressionStatement.is(not(firstOf(LCURLYBRACE, FUNCTION)), expression, eos);
    condition.is(expression);
    ifStatement.is(IF, LPARENTHESIS, condition, RPARENTHESIS, statement, opt(elseClause));
    elseClause.is(ELSE, statement);
    iterationStatement.is(firstOf(
        doWhileStatement,
        whileStatement,
        forInStatement,
        forStatement));
    doWhileStatement.is(DO, statement, WHILE, LPARENTHESIS, condition, RPARENTHESIS, eos);
    whileStatement.is(WHILE, LPARENTHESIS, condition, RPARENTHESIS, statement);
    forInStatement.is(firstOf(
        and(FOR, LPARENTHESIS, leftHandSideExpression, IN, expression, RPARENTHESIS, statement),
        and(FOR, LPARENTHESIS, VAR, variableDeclarationListNoIn, IN, expression, RPARENTHESIS, statement)));
    forStatement.is(firstOf(
        and(FOR, LPARENTHESIS, opt(expressionNoIn), SEMI, opt(condition), SEMI, opt(expression), RPARENTHESIS, statement),
        and(FOR, LPARENTHESIS, VAR, variableDeclarationListNoIn, SEMI, opt(condition), SEMI, opt(expression), RPARENTHESIS, statement)));
    continueStatement.is(firstOf(
        and(CONTINUE, /* TODO no line terminator here */IDENTIFIER, eos),
        and(CONTINUE, eosNoLb)));
    breakStatement.is(firstOf(
        and(BREAK, /* TODO no line terminator here */IDENTIFIER, eos),
        and(BREAK, eosNoLb)));
    returnStatement.is(firstOf(
        and(RETURN, /* TODO no line terminator here */expression, eos),
        and(RETURN, eosNoLb)));
    withStatement.is(WITH, LPARENTHESIS, expression, RPARENTHESIS, statement);
    switchStatement.is(SWITCH, LPARENTHESIS, expression, RPARENTHESIS, caseBlock);
    caseBlock.is(LCURLYBRACE, opt(caseClauses), opt(defaultClause, opt(caseClauses)), RCURLYBRACE);
    caseClauses.is(one2n(caseClause));
    caseClause.is(CASE, expression, COLON, opt(statementList));
    defaultClause.is(DEFAULT, COLON, opt(statementList));
    labelledStatement.is(IDENTIFIER, COLON, statement);
    throwStatement.is(THROW, /* TODO no line terminator here */expression, eos);
    tryStatement.is(TRY, block, firstOf(and(catch_, opt(finally_)), finally_));
    catch_.is(CATCH, LPARENTHESIS, IDENTIFIER, RPARENTHESIS, block);
    finally_.is(FINALLY, block);
    debuggerStatement.is(DEBUGGER, eos);
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
    sourceElement.is(firstOf(
        statement,
        functionDeclaration));
  }

  /**
   * Declares some constructs, which ES5 grammar does not support, but script engines support.
   * For example prototype.js version 1.7 has a function declaration in a block, which is invalid under both ES3 and ES5.
   */
  private static Object permissive(Object object) {
    return object;
  }

}
