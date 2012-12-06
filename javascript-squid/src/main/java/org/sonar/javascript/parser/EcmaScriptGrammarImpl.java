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

import com.sonar.sslr.api.GenericTokenType;
import org.sonar.javascript.api.EcmaScriptGrammar;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;
import org.sonar.javascript.lexer.EcmaScriptLexer;
import org.sonar.javascript.lexer.EcmaScriptRegexpChannel;

import static org.sonar.sslr.parser.GrammarOperators.endOfInput;
import static org.sonar.sslr.parser.GrammarOperators.firstOf;
import static org.sonar.sslr.parser.GrammarOperators.next;
import static org.sonar.sslr.parser.GrammarOperators.nextNot;
import static org.sonar.sslr.parser.GrammarOperators.oneOrMore;
import static org.sonar.sslr.parser.GrammarOperators.optional;
import static org.sonar.sslr.parser.GrammarOperators.regexp;
import static org.sonar.sslr.parser.GrammarOperators.sequence;
import static org.sonar.sslr.parser.GrammarOperators.token;
import static org.sonar.sslr.parser.GrammarOperators.zeroOrMore;

/**
 * Grammar for ECMAScript.
 * Based on <a href="http://www.ecma-international.org/publications/standards/Ecma-262.htm">ECMA-262</a>
 * edition 5.1 (June 2011).
 */
public class EcmaScriptGrammarImpl extends EcmaScriptGrammar {

  public EcmaScriptGrammarImpl() {
    eos.is(firstOf(
        optional(semi),
        next(rcurlybrace),
        next(eof)));
    eosNoLb.is(firstOf(
        optional(semi),
        next(rcurlybrace),
        next(eof)));

    identifierName.is(
        token(GenericTokenType.IDENTIFIER,
            regexp(EcmaScriptLexer.IDENTIFIER)), spacing);

    literal.is(firstOf(
        nullLiteral,
        booleanLiteral,
        numericLiteral,
        stringLiteral,
        regularExpressionLiteral));
    nullLiteral.is(nullKeyword);
    booleanLiteral.is(firstOf(
        trueKeyword,
        falseKeyword));

    lexical();
    expressions();
    statements();
    functionsAndPrograms();
  }

  /**
   * A.1 Lexical
   */
  private void lexical() {
    eof.is(token(GenericTokenType.EOF, endOfInput())).skip();
    identifier.is(
        nextNot(keyword),
        token(GenericTokenType.IDENTIFIER,
            regexp(EcmaScriptLexer.IDENTIFIER)), spacing).skip();
    numericLiteral.is(
        token(EcmaScriptTokenType.NUMERIC_LITERAL,
            regexp(EcmaScriptLexer.NUMERIC_LITERAL)), spacing).skip();
    stringLiteral.is(
        token(GenericTokenType.LITERAL,
            regexp(EcmaScriptLexer.LITERAL)), spacing);
    regularExpressionLiteral.is(
        token(EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL,
            regexp(EcmaScriptRegexpChannel.REGEXP)), spacing);

    keyword.is(firstOf(
        "null",
        "true",
        "false",
        "break",
        "case",
        "catch",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "finally",
        "for",
        "function",
        "if",
        "in",
        "instanceof",
        "new",
        "return",
        "switch",
        "this",
        "throw",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        "class",
        "const",
        "enum",
        "export",
        "extends",
        "super"), nextNot(letterOrDigit));
    letterOrDigit.is(regexp("\\p{javaJavaIdentifierPart}"));

    spacing.is(
        regexp(EcmaScriptLexer.WHITESPACE + "*+"),
        zeroOrMore(
            token(GenericTokenType.COMMENT, regexp(EcmaScriptLexer.COMMENT)),
            regexp(EcmaScriptLexer.WHITESPACE + "*+"))).skip();

    punctuators();
    keywords();
  }

  private void punctuators() {
    lcurlybrace.is(punctuator("{")).skip();
    rcurlybrace.is(punctuator("}")).skip();
    lparenthesis.is(punctuator("(")).skip();
    rparenthesis.is(punctuator(")")).skip();
    lbracket.is(punctuator("[")).skip();
    rbracket.is(punctuator("]")).skip();
    dot.is(punctuator(".")).skip();
    semi.is(punctuator(";")).skip();
    comma.is(punctuator(",")).skip();
    lt.is(punctuator("<", nextNot("="))).skip();
    gt.is(punctuator(">", nextNot("="))).skip();
    le.is(punctuator("<=")).skip();
    ge.is(punctuator(">=")).skip();
    equal.is(punctuator("==", nextNot("="))).skip();
    notequal.is(punctuator("!=", nextNot("="))).skip();
    equal2.is(punctuator("===")).skip();
    notequal2.is(punctuator("!==")).skip();
    plus.is(punctuator("+", nextNot(firstOf("+", "=")))).skip();
    minus.is(punctuator("-", nextNot(firstOf("-", "=")))).skip();
    start.is(punctuator("*", nextNot("="))).skip();
    mod.is(punctuator("%", nextNot("="))).skip();
    div.is(punctuator("/", nextNot("="))).skip();
    inc.is(punctuator("++")).skip();
    dec.is(punctuator("--")).skip();
    sl.is(punctuator("<<", nextNot(firstOf("<", "=")))).skip();
    sr.is(punctuator(">>", nextNot(firstOf(">", "=")))).skip();
    sr2.is(punctuator(">>>")).skip();
    and.is(punctuator("&", nextNot("&", "="))).skip();
    or.is(punctuator("|", nextNot("="))).skip();
    xor.is(punctuator("^", nextNot("="))).skip();
    bang.is(punctuator("!", nextNot("="))).skip();
    tilda.is(punctuator("~")).skip();
    andand.is(punctuator("&&")).skip();
    oror.is(punctuator("||")).skip();
    query.is(punctuator("?")).skip();
    colon.is(punctuator(":")).skip();
    equ.is(punctuator("=", nextNot("="))).skip();
    plusEqu.is(punctuator("+=")).skip();
    minusEqu.is(punctuator("-=")).skip();
    divEqu.is(punctuator("/=")).skip();
    starEqu.is(punctuator("*=")).skip();
    modEqu.is(punctuator("%=")).skip();
    slEqu.is(punctuator("<<=")).skip();
    srEqu.is(punctuator(">>=")).skip();
    srEqu2.is(punctuator(">>>=")).skip();
    andEqu.is(punctuator("&=")).skip();
    orEqu.is(punctuator("|=")).skip();
    xorEqu.is(punctuator("^=")).skip();
  }

  private void keywords() {
    // Reserved words

    nullKeyword.is(keyword("null")).skip();
    trueKeyword.is(keyword("true")).skip();
    falseKeyword.is(keyword("false")).skip();

    // Keywords

    breakKeyword.is(keyword("break")).skip();
    caseKeyword.is(keyword("case")).skip();
    catchKeyword.is(keyword("catch")).skip();
    continueKeyword.is(keyword("continue")).skip();
    debuggerKeyword.is(keyword("debugger")).skip();
    defaultKeyword.is(keyword("default")).skip();
    deleteKeyword.is(keyword("delete")).skip();
    doKeyword.is(keyword("do")).skip();
    elseKeyword.is(keyword("else")).skip();
    finallyKeyword.is(keyword("finally")).skip();
    forKeyword.is(keyword("for")).skip();
    functionKeyword.is(keyword("function")).skip();
    ifKeyword.is(keyword("if")).skip();
    inKeyword.is(keyword("in")).skip();
    instanceofKeyword.is(keyword("instanceof")).skip();
    newKeyword.is(keyword("new")).skip();
    returnKeyword.is(keyword("return")).skip();
    switchKeyword.is(keyword("switch")).skip();
    thisKeyword.is(keyword("this")).skip();
    throwKeyword.is(keyword("throw")).skip();
    tryKeyword.is(keyword("try")).skip();
    typeofKeyword.is(keyword("typeof")).skip();
    varKeyword.is(keyword("var")).skip();
    voidKeyword.is(keyword("void")).skip();
    whileKeyword.is(keyword("while")).skip();
    withKeyword.is(keyword("with")).skip();

    // Future reserved words

    classKeyword.is(keyword("class")).skip();
    constKeyword.is(keyword("const")).skip();
    enumKeyword.is(keyword("enum")).skip();
    exportKeyword.is(keyword("export")).skip();
    extendsKeyword.is(keyword("extends")).skip();
    superKeyword.is(keyword("super")).skip();
  }

  private Object keyword(String value) {
    for (EcmaScriptKeyword tokenType : EcmaScriptKeyword.values()) {
      if (value.equals(tokenType.getValue())) {
        return sequence(token(tokenType, value), nextNot(letterOrDigit), spacing);
      }
    }
    throw new IllegalStateException(value);
  }

  private Object punctuator(String value) {
    for (EcmaScriptPunctuator tokenType : EcmaScriptPunctuator.values()) {
      if (value.equals(tokenType.getValue())) {
        return sequence(token(tokenType, value), spacing);
      }
    }
    throw new IllegalStateException(value);
  }

  private Object word(String value) {
    return sequence(token(GenericTokenType.IDENTIFIER, value), spacing);
  }

  private Object punctuator(String value, Object element) {
    for (EcmaScriptPunctuator tokenType : EcmaScriptPunctuator.values()) {
      if (value.equals(tokenType.getValue())) {
        return sequence(token(tokenType, value), element, spacing);
      }
    }
    throw new IllegalStateException(value);
  }

  /**
   * A.3 Expressions
   */
  private void expressions() {
    primaryExpression.is(firstOf(
        thisKeyword,
        identifier,
        literal,
        arrayLiteral,
        objectLiteral,
        sequence(lparenthesis, expression, rparenthesis)));
    arrayLiteral.is(lbracket, zeroOrMore(firstOf(comma, assignmentExpression)), rbracket);
    objectLiteral.is(lcurlybrace, optional(propertyAssignment, zeroOrMore(comma, propertyAssignment), optional(comma)), rcurlybrace);
    propertyAssignment.is(firstOf(
        sequence(propertyName, colon, assignmentExpression),
        sequence(word("get"), propertyName, lparenthesis, rparenthesis, lcurlybrace, functionBody, rcurlybrace),
        sequence(word("set"), propertyName, lparenthesis, propertySetParameterList, rparenthesis, lcurlybrace, functionBody, rcurlybrace)));
    propertyName.is(firstOf(
        identifierName,
        stringLiteral,
        numericLiteral));
    propertySetParameterList.is(identifier);
    memberExpression.is(
        firstOf(
            primaryExpression,
            functionExpression,
            sequence(newKeyword, memberExpression, arguments)),
        zeroOrMore(firstOf(
            sequence(lbracket, expression, rbracket),
            sequence(dot, identifierName))));
    newExpression.is(firstOf(
        memberExpression,
        sequence(newKeyword, newExpression)));
    callExpression.is(
        sequence(memberExpression, arguments),
        zeroOrMore(firstOf(
            arguments,
            sequence(lbracket, expression, rbracket),
            sequence(dot, identifierName))));
    arguments.is(lparenthesis, optional(assignmentExpression, zeroOrMore(comma, assignmentExpression)), rparenthesis);
    leftHandSideExpression.is(firstOf(
        callExpression,
        newExpression));
    postfixExpression.is(leftHandSideExpression, optional(/* no line terminator here */firstOf(inc, dec)));
    unaryExpression.is(firstOf(
        postfixExpression,
        sequence(deleteKeyword, unaryExpression),
        sequence(voidKeyword, unaryExpression),
        sequence(typeofKeyword, unaryExpression),
        sequence(inc, unaryExpression),
        sequence(dec, unaryExpression),
        sequence(plus, unaryExpression),
        sequence(minus, unaryExpression),
        sequence(tilda, unaryExpression),
        sequence(bang, unaryExpression)));
    multiplicativeExpression.is(unaryExpression, zeroOrMore(firstOf(start, div, mod), unaryExpression)).skipIfOneChild();
    additiveExpression.is(multiplicativeExpression, zeroOrMore(firstOf(plus, minus), multiplicativeExpression)).skipIfOneChild();
    shiftExpression.is(additiveExpression, zeroOrMore(firstOf(sl, sr, sr2), additiveExpression)).skipIfOneChild();

    relationalExpression.is(shiftExpression, zeroOrMore(firstOf(lt, gt, le, ge, instanceofKeyword, inKeyword), shiftExpression)).skipIfOneChild();
    relationalExpressionNoIn.is(shiftExpression, zeroOrMore(firstOf(lt, gt, le, ge, instanceofKeyword), shiftExpression)).skipIfOneChild();

    equalityExpression.is(relationalExpression, zeroOrMore(firstOf(equal, notequal, equal2, notequal2), relationalExpression)).skipIfOneChild();
    equalityExpressionNoIn.is(relationalExpressionNoIn, zeroOrMore(firstOf(equal, notequal, equal2, notequal2), relationalExpressionNoIn)).skipIfOneChild();

    bitwiseAndExpression.is(equalityExpression, zeroOrMore(and, equalityExpression)).skipIfOneChild();
    bitwiseAndExpressionNoIn.is(equalityExpressionNoIn, zeroOrMore(and, equalityExpressionNoIn)).skipIfOneChild();

    bitwiseXorExpression.is(bitwiseAndExpression, zeroOrMore(xor, bitwiseAndExpression)).skipIfOneChild();
    bitwiseXorExpressionNoIn.is(bitwiseAndExpressionNoIn, zeroOrMore(xor, bitwiseAndExpressionNoIn)).skipIfOneChild();

    bitwiseOrExpression.is(bitwiseXorExpression, zeroOrMore(or, bitwiseXorExpression)).skipIfOneChild();
    bitwiseOrExpressionNoIn.is(bitwiseXorExpressionNoIn, zeroOrMore(or, bitwiseXorExpressionNoIn)).skipIfOneChild();

    logicalAndExpression.is(bitwiseOrExpression, zeroOrMore(andand, bitwiseOrExpression)).skipIfOneChild();
    logicalAndExpressionNoIn.is(bitwiseOrExpressionNoIn, zeroOrMore(andand, bitwiseOrExpressionNoIn)).skipIfOneChild();

    logicalOrExpression.is(logicalAndExpression, zeroOrMore(oror, logicalAndExpression)).skipIfOneChild();
    logicalOrExpressionNoIn.is(logicalAndExpressionNoIn, zeroOrMore(oror, logicalAndExpressionNoIn)).skipIfOneChild();

    conditionalExpression.is(logicalOrExpression, optional(query, assignmentExpression, colon, assignmentExpression)).skipIfOneChild();
    conditionalExpressionNoIn.is(logicalOrExpressionNoIn, optional(query, assignmentExpression, colon, assignmentExpressionNoIn)).skipIfOneChild();

    assignmentExpression.is(firstOf(
        sequence(leftHandSideExpression, assignmentOperator, assignmentExpression),
        conditionalExpression)).skipIfOneChild();
    assignmentExpressionNoIn.is(firstOf(
        sequence(leftHandSideExpression, assignmentOperator, assignmentExpressionNoIn),
        conditionalExpressionNoIn)).skipIfOneChild();

    assignmentOperator.is(firstOf(
        equ,
        starEqu,
        divEqu,
        modEqu,
        plusEqu,
        minusEqu,
        slEqu,
        srEqu,
        srEqu2,
        andEqu,
        xorEqu,
        orEqu));

    expression.is(assignmentExpression, zeroOrMore(comma, assignmentExpression));
    expressionNoIn.is(assignmentExpressionNoIn, zeroOrMore(comma, assignmentExpressionNoIn));
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
    block.is(lcurlybrace, optional(statementList), rcurlybrace);
    statementList.is(oneOrMore(firstOf(statement, permissive(functionDeclaration))));
    variableStatement.is(varKeyword, variableDeclarationList, eos);
    variableDeclarationList.is(variableDeclaration, zeroOrMore(comma, variableDeclaration));
    variableDeclarationListNoIn.is(variableDeclarationNoIn, zeroOrMore(comma, variableDeclarationNoIn));
    variableDeclaration.is(identifier, optional(initialiser));
    variableDeclarationNoIn.is(identifier, optional(initialiserNoIn));
    initialiser.is(equ, assignmentExpression);
    initialiserNoIn.is(equ, assignmentExpressionNoIn);
    emptyStatement.is(semi);
    expressionStatement.is(nextNot(firstOf(lcurlybrace, functionKeyword)), expression, eos);
    condition.is(expression);
    ifStatement.is(ifKeyword, lparenthesis, condition, rparenthesis, statement, optional(elseClause));
    elseClause.is(elseKeyword, statement);
    iterationStatement.is(firstOf(
        doWhileStatement,
        whileStatement,
        forInStatement,
        forStatement));
    doWhileStatement.is(doKeyword, statement, whileKeyword, lparenthesis, condition, rparenthesis, eos);
    whileStatement.is(whileKeyword, lparenthesis, condition, rparenthesis, statement);
    forInStatement.is(firstOf(
        sequence(forKeyword, lparenthesis, leftHandSideExpression, inKeyword, expression, rparenthesis, statement),
        sequence(forKeyword, lparenthesis, varKeyword, variableDeclarationListNoIn, inKeyword, expression, rparenthesis, statement)));
    forStatement.is(firstOf(
        sequence(forKeyword, lparenthesis, optional(expressionNoIn), semi, optional(condition), semi, optional(expression), rparenthesis, statement),
        sequence(forKeyword, lparenthesis, varKeyword, variableDeclarationListNoIn, semi, optional(condition), semi, optional(expression), rparenthesis, statement)));
    continueStatement.is(firstOf(
        sequence(continueKeyword, /* TODO no line terminator here */identifier, eos),
        sequence(continueKeyword, eosNoLb)));
    breakStatement.is(firstOf(
        sequence(breakKeyword, /* TODO no line terminator here */identifier, eos),
        sequence(breakKeyword, eosNoLb)));
    returnStatement.is(firstOf(
        sequence(returnKeyword, /* TODO no line terminator here */expression, eos),
        sequence(returnKeyword, eosNoLb)));
    withStatement.is(withKeyword, lparenthesis, expression, rparenthesis, statement);
    switchStatement.is(switchKeyword, lparenthesis, expression, rparenthesis, caseBlock);
    caseBlock.is(lcurlybrace, optional(caseClauses), optional(defaultClause, optional(caseClauses)), rcurlybrace);
    caseClauses.is(oneOrMore(caseClause));
    caseClause.is(caseKeyword, expression, colon, optional(statementList));
    defaultClause.is(defaultKeyword, colon, optional(statementList));
    labelledStatement.is(identifier, colon, statement);
    throwStatement.is(throwKeyword, /* TODO no line terminator here */expression, eos);
    tryStatement.is(tryKeyword, block, firstOf(sequence(catch_, optional(finally_)), finally_));
    catch_.is(catchKeyword, lparenthesis, identifier, rparenthesis, block);
    finally_.is(finallyKeyword, block);
    debuggerStatement.is(debuggerKeyword, eos);
  }

  /**
   * A.5 Functions and Programs
   */
  private void functionsAndPrograms() {
    functionDeclaration.is(functionKeyword, identifier, lparenthesis, optional(formalParameterList), rparenthesis, lcurlybrace, functionBody, rcurlybrace);
    functionExpression.is(functionKeyword, optional(identifier), lparenthesis, optional(formalParameterList), rparenthesis, lcurlybrace, functionBody, rcurlybrace);
    formalParameterList.is(identifier, zeroOrMore(comma, identifier));
    functionBody.is(optional(sourceElements));
    program.is(optional(shebang), spacing, optional(sourceElements), eof);
    sourceElements.is(oneOrMore(sourceElement));
    sourceElement.is(firstOf(
        statement,
        functionDeclaration));

    shebang.is("#!", regexp("[^\\n\\r]*+")).skip();
  }

  /**
   * Declares some constructs, which ES5 grammar does not support, but script engines support.
   * For example prototype.js version 1.7 has a function declaration in a block, which is invalid under both ES3 and ES5.
   */
  private static Object permissive(Object object) {
    return object;
  }

}
