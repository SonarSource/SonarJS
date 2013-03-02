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
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.lexer.EcmaScriptLexer;
import org.sonar.javascript.lexer.EcmaScriptRegexpChannel;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.grammar.LexerlessGrammarBuilder;
import org.sonar.sslr.parser.LexerlessGrammar;

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
import static org.sonar.javascript.api.EcmaScriptTokenType.IDENTIFIER;
import static org.sonar.javascript.api.EcmaScriptTokenType.NUMERIC_LITERAL;
import static org.sonar.javascript.api.EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL;

/**
 * Grammar for ECMAScript.
 * Based on <a href="http://www.ecma-international.org/publications/standards/Ecma-262.htm">ECMA-262</a>
 * edition 5.1 (June 2011).
 */
public enum EcmaScriptGrammar implements GrammarRuleKey {

  /**
   * End of file.
   */
  EOF,

  /**
   * End of statement.
   */
  EOS,
  EOS_NO_LB,

  IDENTIFIER_NAME,

  CONDITION,

  // A.1 Lexical

  LITERAL,
  NULL_LITERAL,
  BOOLEAN_LITERAL,
  STRING_LITERAL,

  KEYWORD,
  LETTER_OR_DIGIT,

  /**
   * Spacing.
   */
  SPACING,

  /**
   * Spacing without line break.
   */
  SPACING_NO_LB,
  NEXT_NOT_LB,
  LINE_TERMINATOR_SEQUENCE,

  // A.3 Expressions

  PRIMARY_EXPRESSION,
  ARRAY_LITERAL,
  OBJECT_LITERAL,
  PROPERTY_ASSIGNMENT,
  PROPERTY_NAME,
  PROPERTY_SET_PARAMETER_LIST,
  MEMBER_EXPRESSION,
  NEW_EXPRESSION,
  CALL_EXPRESSION,
  ARGUMENTS,
  LEFT_HAND_SIDE_EXPRESSION,
  POSTFIX_EXPRESSION,
  UNARY_EXPRESSION,
  MULTIPLICATIVE_EXPRESSION,
  ADDITIVE_EXPRESSION,
  SHIFT_EXPRESSION,
  RELATIONAL_EXPRESSION,
  RELATIONAL_EXPRESSION_NO_IN,
  EQUALITY_EXPRESSION,
  EQUALITY_EXPRESSION_NO_IN,
  BITWISE_AND_EXPRESSION,
  BITWISE_AND_EXPRESSION_NO_IN,
  BITWISE_XOR_EXPRESSION,
  BITWISE_XOR_EXPRESSION_NO_IN,
  BITWISE_OR_EXPRESSION,
  BITWISE_OR_EXPRESSION_NO_IN,
  LOGICAL_AND_EXPRESSION,
  LOGICAL_AND_EXPRESSION_NO_IN,
  LOGICAL_OR_EXPRESSION,
  LOGICAL_OR_EXPRESSION_NO_IN,
  CONDITIONAL_EXPRESSION,
  CONDITIONAL_EXPRESSION_NO_IN,
  ASSIGNMENT_EXPRESSION,
  ASSIGNMENT_EXPRESSION_NO_IN,
  ASSIGNMENT_OPERATOR,
  EXPRESSION,
  EXPRESSION_NO_IN,

  // A.4 Statements

  STATEMENT,
  BLOCK,
  STATEMENT_LIST,
  VARIABLE_STATEMENT,
  VARIABLE_DECLARATION_LIST,
  VARIABLE_DECLARATION_LIST_NO_IN,
  VARIABLE_DECLARATION,
  VARIABLE_DECLARATION_NO_IN,
  INITIALISER,
  INITIALISER_NO_IN,
  EMPTY_STATEMENT,
  EXPRESSION_STATEMENT,
  IF_STATEMENT,
  ELSE_CLAUSE,
  ITERATION_STATEMENT,
  DO_WHILE_STATEMENT,
  WHILE_STATEMENT,
  FOR_IN_STATEMENT,
  FOR_STATEMENT,
  CONTINUE_STATEMENT,
  BREAK_STATEMENT,
  RETURN_STATEMENT,
  WITH_STATEMENT,
  SWITCH_STATEMENT,
  CASE_BLOCK,
  CASE_CLAUSES,
  CASE_CLAUSE,
  DEFAULT_CLAUSE,
  LABELLED_STATEMENT,
  THROW_STATEMENT,
  TRY_STATEMENT,
  CATCH_,
  FINALLY_,
  DEBUGGER_STATEMENT,

  // A.5 Functions and Programs

  FUNCTION_DECLARATION,
  FUNCTION_EXPRESSION,
  FORMAL_PARAMETER_LIST,
  FUNCTION_BODY,
  PROGRAM,
  SOURCE_ELEMENTS,
  SOURCE_ELEMENT,

  SHEBANG;

  public static LexerlessGrammar createGrammar() {
    return createGrammarBuilder().build();
  }

  public static LexerlessGrammarBuilder createGrammarBuilder() {
    LexerlessGrammarBuilder b = LexerlessGrammarBuilder.create();

    b.rule(IDENTIFIER_NAME).is(
        SPACING,
        b.regexp(EcmaScriptLexer.IDENTIFIER));

    b.rule(LITERAL).is(b.firstOf(
        NULL_LITERAL,
        BOOLEAN_LITERAL,
        NUMERIC_LITERAL,
        STRING_LITERAL,
        REGULAR_EXPRESSION_LITERAL));
    b.rule(NULL_LITERAL).is(NULL);
    b.rule(BOOLEAN_LITERAL).is(b.firstOf(
        TRUE,
        FALSE));

    lexical(b);
    expressions(b);
    statements(b);
    functionsAndPrograms(b);

    b.setRootRule(PROGRAM);

    return b;
  }

  /**
   * A.1 Lexical
   */
  private static void lexical(LexerlessGrammarBuilder b) {
    b.rule(SPACING).is(
        b.skippedTrivia(b.regexp("[" + EcmaScriptLexer.LINE_TERMINATOR + EcmaScriptLexer.WHITESPACE + "]*+")),
        b.zeroOrMore(
            b.commentTrivia(b.regexp(EcmaScriptLexer.COMMENT)),
            b.skippedTrivia(b.regexp("[" + EcmaScriptLexer.LINE_TERMINATOR + EcmaScriptLexer.WHITESPACE + "]*+")))).skip();

    b.rule(SPACING_NO_LB).is(
        b.zeroOrMore(
            b.firstOf(
                b.skippedTrivia(b.regexp("[" + EcmaScriptLexer.WHITESPACE + "]++")),
                b.commentTrivia(b.regexp("(?:" + EcmaScriptLexer.SINGLE_LINE_COMMENT + "|" + EcmaScriptLexer.MULTI_LINE_COMMENT_NO_LB + ")"))))).skip();
    b.rule(NEXT_NOT_LB).is(b.nextNot(b.regexp("(?:" + EcmaScriptLexer.MULTI_LINE_COMMENT + "|[" + EcmaScriptLexer.LINE_TERMINATOR + "])"))).skip();

    b.rule(LINE_TERMINATOR_SEQUENCE).is(b.skippedTrivia(b.regexp("(?:\\n|\\r\\n|\\r|\\u2028|\\u2029)"))).skip();

    b.rule(EOS).is(b.firstOf(
        b.sequence(SPACING, SEMI),
        b.sequence(SPACING_NO_LB, LINE_TERMINATOR_SEQUENCE),
        b.sequence(SPACING_NO_LB, b.next("}")),
        b.sequence(SPACING, b.endOfInput())));

    b.rule(EOS_NO_LB).is(b.firstOf(
        b.sequence(SPACING_NO_LB, NEXT_NOT_LB, SEMI),
        b.sequence(SPACING_NO_LB, LINE_TERMINATOR_SEQUENCE),
        b.sequence(SPACING_NO_LB, b.next("}")),
        b.sequence(SPACING_NO_LB, b.endOfInput())));

    b.rule(EOF).is(b.token(GenericTokenType.EOF, b.endOfInput())).skip();
    b.rule(IDENTIFIER).is(
        SPACING,
        b.nextNot(KEYWORD),
        b.regexp(EcmaScriptLexer.IDENTIFIER));
    b.rule(NUMERIC_LITERAL).is(
        SPACING,
        b.regexp(EcmaScriptLexer.NUMERIC_LITERAL));
    b.rule(STRING_LITERAL).is(
        SPACING,
        b.token(GenericTokenType.LITERAL, b.regexp(EcmaScriptLexer.LITERAL)));
    b.rule(REGULAR_EXPRESSION_LITERAL).is(
        SPACING,
        b.regexp(EcmaScriptRegexpChannel.REGEXP));

    b.rule(KEYWORD).is(b.firstOf(
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
        "super"), b.nextNot(LETTER_OR_DIGIT));
    b.rule(LETTER_OR_DIGIT).is(b.regexp("\\p{javaJavaIdentifierPart}"));

    punctuators(b);
    keywords(b);
  }

  private static void punctuators(LexerlessGrammarBuilder b) {
    punctuator(b, LCURLYBRACE, "{");
    punctuator(b, RCURLYBRACE, "}");
    punctuator(b, LPARENTHESIS, "(");
    punctuator(b, RPARENTHESIS, ")");
    punctuator(b, LBRACKET, "[");
    punctuator(b, RBRACKET, "]");
    punctuator(b, DOT, ".");
    punctuator(b, SEMI, ";");
    punctuator(b, COMMA, ",");
    punctuator(b, LT, "<", b.nextNot("="));
    punctuator(b, GT, ">", b.nextNot("="));
    punctuator(b, LE, "<=");
    punctuator(b, GE, ">=");
    punctuator(b, EQUAL, "==", b.nextNot("="));
    punctuator(b, NOTEQUAL, "!=", b.nextNot("="));
    punctuator(b, EQUAL2, "===");
    punctuator(b, NOTEQUAL2, "!==");
    punctuator(b, PLUS, "+", b.nextNot(b.firstOf("+", "=")));
    punctuator(b, MINUS, "-", b.nextNot(b.firstOf("-", "=")));
    punctuator(b, STAR, "*", b.nextNot("="));
    punctuator(b, MOD, "%", b.nextNot("="));
    punctuator(b, DIV, "/", b.nextNot("="));
    punctuator(b, INC, "++");
    punctuator(b, DEC, "--");
    punctuator(b, SL, "<<", b.nextNot(b.firstOf("<", "=")));
    punctuator(b, SR, ">>", b.nextNot(b.firstOf(">", "=")));
    punctuator(b, SR2, ">>>");
    punctuator(b, AND, "&", b.nextNot("&", "="));
    punctuator(b, OR, "|", b.nextNot("="));
    punctuator(b, XOR, "^", b.nextNot("="));
    punctuator(b, BANG, "!", b.nextNot("="));
    punctuator(b, TILDA, "~");
    punctuator(b, ANDAND, "&&");
    punctuator(b, OROR, "||");
    punctuator(b, QUERY, "?");
    punctuator(b, COLON, ":");
    punctuator(b, EQU, "=", b.nextNot("="));
    punctuator(b, PLUS_EQU, "+=");
    punctuator(b, MINUS_EQU, "-=");
    punctuator(b, DIV_EQU, "/=");
    punctuator(b, STAR_EQU, "*=");
    punctuator(b, MOD_EQU, "%=");
    punctuator(b, SL_EQU, "<<=");
    punctuator(b, SR_EQU, ">>=");
    punctuator(b, SR_EQU2, ">>>=");
    punctuator(b, AND_EQU, "&=");
    punctuator(b, OR_EQU, "|=");
    punctuator(b, XOR_EQU, "^=");
  }

  private static void keywords(LexerlessGrammarBuilder b) {
    for (EcmaScriptKeyword tokenType : EcmaScriptKeyword.values()) {
      b.rule(tokenType).is(SPACING, tokenType.getValue(), b.nextNot(LETTER_OR_DIGIT));
    }
  }

  private static void punctuator(LexerlessGrammarBuilder b, GrammarRuleKey ruleKey, String value) {
    for (EcmaScriptPunctuator tokenType : EcmaScriptPunctuator.values()) {
      if (value.equals(tokenType.getValue())) {
        b.rule(tokenType).is(SPACING, value);
        return;
      }
    }
    throw new IllegalStateException(value);
  }

  private static Object word(LexerlessGrammarBuilder b, String value) {
    return b.sequence(SPACING, b.token(GenericTokenType.IDENTIFIER, value));
  }

  private static void punctuator(LexerlessGrammarBuilder b, GrammarRuleKey ruleKey, String value, Object element) {
    for (EcmaScriptPunctuator tokenType : EcmaScriptPunctuator.values()) {
      if (value.equals(tokenType.getValue())) {
        b.rule(tokenType).is(SPACING, value, element);
        return;
      }
    }
    throw new IllegalStateException(value);
  }

  /**
   * A.3 Expressions
   */
  private static void expressions(LexerlessGrammarBuilder b) {
    b.rule(PRIMARY_EXPRESSION).is(b.firstOf(
        THIS,
        IDENTIFIER,
        LITERAL,
        ARRAY_LITERAL,
        OBJECT_LITERAL,
        b.sequence(LPARENTHESIS, EXPRESSION, RPARENTHESIS)));
    b.rule(ARRAY_LITERAL).is(LBRACKET, b.zeroOrMore(b.firstOf(COMMA, ASSIGNMENT_EXPRESSION)), RBRACKET);
    b.rule(OBJECT_LITERAL).is(LCURLYBRACE, b.optional(PROPERTY_ASSIGNMENT, b.zeroOrMore(COMMA, PROPERTY_ASSIGNMENT), b.optional(COMMA)), RCURLYBRACE);
    b.rule(PROPERTY_ASSIGNMENT).is(b.firstOf(
        b.sequence(PROPERTY_NAME, COLON, ASSIGNMENT_EXPRESSION),
        b.sequence(word(b, "get"), PROPERTY_NAME, LPARENTHESIS, RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE),
        b.sequence(word(b, "set"), PROPERTY_NAME, LPARENTHESIS, PROPERTY_SET_PARAMETER_LIST, RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE)));
    b.rule(PROPERTY_NAME).is(b.firstOf(
        IDENTIFIER_NAME,
        STRING_LITERAL,
        NUMERIC_LITERAL));
    b.rule(PROPERTY_SET_PARAMETER_LIST).is(IDENTIFIER);
    b.rule(MEMBER_EXPRESSION).is(
        b.firstOf(
            PRIMARY_EXPRESSION,
            FUNCTION_EXPRESSION,
            b.sequence(NEW, MEMBER_EXPRESSION, ARGUMENTS)),
        b.zeroOrMore(b.firstOf(
            b.sequence(LBRACKET, EXPRESSION, RBRACKET),
            b.sequence(DOT, IDENTIFIER_NAME))));
    b.rule(NEW_EXPRESSION).is(b.firstOf(
        MEMBER_EXPRESSION,
        b.sequence(NEW, NEW_EXPRESSION)));
    b.rule(CALL_EXPRESSION).is(
        b.sequence(MEMBER_EXPRESSION, ARGUMENTS),
        b.zeroOrMore(b.firstOf(
            ARGUMENTS,
            b.sequence(LBRACKET, EXPRESSION, RBRACKET),
            b.sequence(DOT, IDENTIFIER_NAME))));
    b.rule(ARGUMENTS).is(LPARENTHESIS, b.optional(ASSIGNMENT_EXPRESSION, b.zeroOrMore(COMMA, ASSIGNMENT_EXPRESSION)), RPARENTHESIS);
    b.rule(LEFT_HAND_SIDE_EXPRESSION).is(b.firstOf(
        CALL_EXPRESSION,
        NEW_EXPRESSION));
    b.rule(POSTFIX_EXPRESSION).is(LEFT_HAND_SIDE_EXPRESSION, b.optional(/* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, b.firstOf(INC, DEC)));
    b.rule(UNARY_EXPRESSION).is(b.firstOf(
        POSTFIX_EXPRESSION,
        b.sequence(DELETE, UNARY_EXPRESSION),
        b.sequence(VOID, UNARY_EXPRESSION),
        b.sequence(TYPEOF, UNARY_EXPRESSION),
        b.sequence(INC, UNARY_EXPRESSION),
        b.sequence(DEC, UNARY_EXPRESSION),
        b.sequence(PLUS, UNARY_EXPRESSION),
        b.sequence(MINUS, UNARY_EXPRESSION),
        b.sequence(TILDA, UNARY_EXPRESSION),
        b.sequence(BANG, UNARY_EXPRESSION)));
    b.rule(MULTIPLICATIVE_EXPRESSION).is(UNARY_EXPRESSION, b.zeroOrMore(b.firstOf(STAR, DIV, MOD), UNARY_EXPRESSION)).skipIfOneChild();
    b.rule(ADDITIVE_EXPRESSION).is(MULTIPLICATIVE_EXPRESSION, b.zeroOrMore(b.firstOf(PLUS, MINUS), MULTIPLICATIVE_EXPRESSION)).skipIfOneChild();
    b.rule(SHIFT_EXPRESSION).is(ADDITIVE_EXPRESSION, b.zeroOrMore(b.firstOf(SL, SR, SR2), ADDITIVE_EXPRESSION)).skipIfOneChild();

    b.rule(RELATIONAL_EXPRESSION).is(SHIFT_EXPRESSION, b.zeroOrMore(b.firstOf(LT, GT, LE, GE, INSTANCEOF, IN), SHIFT_EXPRESSION)).skipIfOneChild();
    b.rule(RELATIONAL_EXPRESSION_NO_IN).is(SHIFT_EXPRESSION, b.zeroOrMore(b.firstOf(LT, GT, LE, GE, INSTANCEOF), SHIFT_EXPRESSION)).skipIfOneChild();

    b.rule(EQUALITY_EXPRESSION).is(RELATIONAL_EXPRESSION, b.zeroOrMore(b.firstOf(EQUAL, NOTEQUAL, EQUAL2, NOTEQUAL2), RELATIONAL_EXPRESSION)).skipIfOneChild();
    b.rule(EQUALITY_EXPRESSION_NO_IN).is(RELATIONAL_EXPRESSION_NO_IN, b.zeroOrMore(b.firstOf(EQUAL, NOTEQUAL, EQUAL2, NOTEQUAL2), RELATIONAL_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(BITWISE_AND_EXPRESSION).is(EQUALITY_EXPRESSION, b.zeroOrMore(AND, EQUALITY_EXPRESSION)).skipIfOneChild();
    b.rule(BITWISE_AND_EXPRESSION_NO_IN).is(EQUALITY_EXPRESSION_NO_IN, b.zeroOrMore(AND, EQUALITY_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(BITWISE_XOR_EXPRESSION).is(BITWISE_AND_EXPRESSION, b.zeroOrMore(XOR, BITWISE_AND_EXPRESSION)).skipIfOneChild();
    b.rule(BITWISE_XOR_EXPRESSION_NO_IN).is(BITWISE_AND_EXPRESSION_NO_IN, b.zeroOrMore(XOR, BITWISE_AND_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(BITWISE_OR_EXPRESSION).is(BITWISE_XOR_EXPRESSION, b.zeroOrMore(OR, BITWISE_XOR_EXPRESSION)).skipIfOneChild();
    b.rule(BITWISE_OR_EXPRESSION_NO_IN).is(BITWISE_XOR_EXPRESSION_NO_IN, b.zeroOrMore(OR, BITWISE_XOR_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(LOGICAL_AND_EXPRESSION).is(BITWISE_OR_EXPRESSION, b.zeroOrMore(ANDAND, BITWISE_OR_EXPRESSION)).skipIfOneChild();
    b.rule(LOGICAL_AND_EXPRESSION_NO_IN).is(BITWISE_OR_EXPRESSION_NO_IN, b.zeroOrMore(ANDAND, BITWISE_OR_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(LOGICAL_OR_EXPRESSION).is(LOGICAL_AND_EXPRESSION, b.zeroOrMore(OROR, LOGICAL_AND_EXPRESSION)).skipIfOneChild();
    b.rule(LOGICAL_OR_EXPRESSION_NO_IN).is(LOGICAL_AND_EXPRESSION_NO_IN, b.zeroOrMore(OROR, LOGICAL_AND_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(CONDITIONAL_EXPRESSION).is(LOGICAL_OR_EXPRESSION, b.optional(QUERY, ASSIGNMENT_EXPRESSION, COLON, ASSIGNMENT_EXPRESSION)).skipIfOneChild();
    b.rule(CONDITIONAL_EXPRESSION_NO_IN).is(LOGICAL_OR_EXPRESSION_NO_IN, b.optional(QUERY, ASSIGNMENT_EXPRESSION, COLON, ASSIGNMENT_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(ASSIGNMENT_EXPRESSION).is(b.firstOf(
        b.sequence(LEFT_HAND_SIDE_EXPRESSION, ASSIGNMENT_OPERATOR, ASSIGNMENT_EXPRESSION),
        CONDITIONAL_EXPRESSION)).skipIfOneChild();
    b.rule(ASSIGNMENT_EXPRESSION_NO_IN).is(b.firstOf(
        b.sequence(LEFT_HAND_SIDE_EXPRESSION, ASSIGNMENT_OPERATOR, ASSIGNMENT_EXPRESSION_NO_IN),
        CONDITIONAL_EXPRESSION_NO_IN)).skipIfOneChild();

    b.rule(ASSIGNMENT_OPERATOR).is(b.firstOf(
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

    b.rule(EXPRESSION).is(ASSIGNMENT_EXPRESSION, b.zeroOrMore(COMMA, ASSIGNMENT_EXPRESSION));
    b.rule(EXPRESSION_NO_IN).is(ASSIGNMENT_EXPRESSION_NO_IN, b.zeroOrMore(COMMA, ASSIGNMENT_EXPRESSION_NO_IN));
  }

  /**
   * A.4 Statement
   */
  private static void statements(LexerlessGrammarBuilder b) {
    b.rule(STATEMENT).is(b.firstOf(
        BLOCK,
        VARIABLE_STATEMENT,
        EMPTY_STATEMENT,
        LABELLED_STATEMENT,
        EXPRESSION_STATEMENT,
        IF_STATEMENT,
        ITERATION_STATEMENT,
        CONTINUE_STATEMENT,
        BREAK_STATEMENT,
        RETURN_STATEMENT,
        WITH_STATEMENT,
        SWITCH_STATEMENT,
        THROW_STATEMENT,
        TRY_STATEMENT,
        DEBUGGER_STATEMENT));
    b.rule(BLOCK).is(LCURLYBRACE, b.optional(STATEMENT_LIST), RCURLYBRACE);
    b.rule(STATEMENT_LIST).is(b.oneOrMore(b.firstOf(STATEMENT, permissive(FUNCTION_DECLARATION))));
    b.rule(VARIABLE_STATEMENT).is(VAR, VARIABLE_DECLARATION_LIST, EOS);
    b.rule(VARIABLE_DECLARATION_LIST).is(VARIABLE_DECLARATION, b.zeroOrMore(COMMA, VARIABLE_DECLARATION));
    b.rule(VARIABLE_DECLARATION_LIST_NO_IN).is(VARIABLE_DECLARATION_NO_IN, b.zeroOrMore(COMMA, VARIABLE_DECLARATION_NO_IN));
    b.rule(VARIABLE_DECLARATION).is(IDENTIFIER, b.optional(INITIALISER));
    b.rule(VARIABLE_DECLARATION_NO_IN).is(IDENTIFIER, b.optional(INITIALISER_NO_IN));
    b.rule(INITIALISER).is(EQU, ASSIGNMENT_EXPRESSION);
    b.rule(INITIALISER_NO_IN).is(EQU, ASSIGNMENT_EXPRESSION_NO_IN);
    b.rule(EMPTY_STATEMENT).is(SEMI);
    b.rule(EXPRESSION_STATEMENT).is(b.nextNot(b.firstOf(LCURLYBRACE, FUNCTION)), EXPRESSION, EOS);
    b.rule(CONDITION).is(EXPRESSION);
    b.rule(IF_STATEMENT).is(IF, LPARENTHESIS, CONDITION, RPARENTHESIS, STATEMENT, b.optional(ELSE_CLAUSE));
    b.rule(ELSE_CLAUSE).is(ELSE, STATEMENT);
    b.rule(ITERATION_STATEMENT).is(b.firstOf(
        DO_WHILE_STATEMENT,
        WHILE_STATEMENT,
        FOR_IN_STATEMENT,
        FOR_STATEMENT));
    b.rule(DO_WHILE_STATEMENT).is(DO, STATEMENT, WHILE, LPARENTHESIS, CONDITION, RPARENTHESIS, EOS);
    b.rule(WHILE_STATEMENT).is(WHILE, LPARENTHESIS, CONDITION, RPARENTHESIS, STATEMENT);
    b.rule(FOR_IN_STATEMENT).is(b.firstOf(
        b.sequence(FOR, LPARENTHESIS, LEFT_HAND_SIDE_EXPRESSION, IN, EXPRESSION, RPARENTHESIS, STATEMENT),
        b.sequence(FOR, LPARENTHESIS, VAR, VARIABLE_DECLARATION_LIST_NO_IN, IN, EXPRESSION, RPARENTHESIS, STATEMENT)));
    b.rule(FOR_STATEMENT).is(b.firstOf(
        b.sequence(FOR, LPARENTHESIS, b.optional(EXPRESSION_NO_IN), SEMI, b.optional(CONDITION), SEMI, b.optional(EXPRESSION), RPARENTHESIS, STATEMENT),
        b.sequence(FOR, LPARENTHESIS, VAR, VARIABLE_DECLARATION_LIST_NO_IN, SEMI, b.optional(CONDITION), SEMI, b.optional(EXPRESSION), RPARENTHESIS, STATEMENT)));
    b.rule(CONTINUE_STATEMENT).is(b.firstOf(
        b.sequence(CONTINUE, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, IDENTIFIER, EOS),
        b.sequence(CONTINUE, EOS_NO_LB)));
    b.rule(BREAK_STATEMENT).is(b.firstOf(
        b.sequence(BREAK, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, IDENTIFIER, EOS),
        b.sequence(BREAK, EOS_NO_LB)));
    b.rule(RETURN_STATEMENT).is(b.firstOf(
        b.sequence(RETURN, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, EXPRESSION, EOS),
        b.sequence(RETURN, EOS_NO_LB)));
    b.rule(WITH_STATEMENT).is(WITH, LPARENTHESIS, EXPRESSION, RPARENTHESIS, STATEMENT);
    b.rule(SWITCH_STATEMENT).is(SWITCH, LPARENTHESIS, EXPRESSION, RPARENTHESIS, CASE_BLOCK);
    b.rule(CASE_BLOCK).is(LCURLYBRACE, b.optional(CASE_CLAUSES), b.optional(DEFAULT_CLAUSE, b.optional(CASE_CLAUSES)), RCURLYBRACE);
    b.rule(CASE_CLAUSES).is(b.oneOrMore(CASE_CLAUSE));
    b.rule(CASE_CLAUSE).is(CASE, EXPRESSION, COLON, b.optional(STATEMENT_LIST));
    b.rule(DEFAULT_CLAUSE).is(DEFAULT, COLON, b.optional(STATEMENT_LIST));
    b.rule(LABELLED_STATEMENT).is(IDENTIFIER, COLON, STATEMENT);
    b.rule(THROW_STATEMENT).is(THROW, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, EXPRESSION, EOS);
    b.rule(TRY_STATEMENT).is(TRY, BLOCK, b.firstOf(b.sequence(CATCH_, b.optional(FINALLY_)), FINALLY_));
    b.rule(CATCH_).is(CATCH, LPARENTHESIS, IDENTIFIER, RPARENTHESIS, BLOCK);
    b.rule(FINALLY_).is(FINALLY, BLOCK);
    b.rule(DEBUGGER_STATEMENT).is(DEBUGGER, EOS);
  }

  /**
   * A.5 Functions and Programs
   */
  private static void functionsAndPrograms(LexerlessGrammarBuilder b) {
    b.rule(FUNCTION_DECLARATION).is(FUNCTION, IDENTIFIER, LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);
    b.rule(FUNCTION_EXPRESSION).is(FUNCTION, b.optional(IDENTIFIER), LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);
    b.rule(FORMAL_PARAMETER_LIST).is(IDENTIFIER, b.zeroOrMore(COMMA, IDENTIFIER));
    b.rule(FUNCTION_BODY).is(b.optional(SOURCE_ELEMENTS));
    b.rule(PROGRAM).is(b.optional(SHEBANG), b.optional(SOURCE_ELEMENTS), SPACING, EOF);
    b.rule(SOURCE_ELEMENTS).is(b.oneOrMore(SOURCE_ELEMENT));
    b.rule(SOURCE_ELEMENT).is(b.firstOf(
        STATEMENT,
        FUNCTION_DECLARATION));

    b.rule(SHEBANG).is("#!", b.regexp("[^\\n\\r]*+")).skip();
  }

  /**
   * Declares some constructs, which ES5 grammar does not support, but script engines support.
   * For example prototype.js version 1.7 has a function declaration in a block, which is invalid under both ES3 and ES5.
   */
  private static Object permissive(Object object) {
    return object;
  }

  private final String internalName;

  private EcmaScriptGrammar() {
    String name = name();
    StringBuilder sb = new StringBuilder();
    int i = 0;
    while (i < name.length()) {
      if (name.charAt(i) == '_' && i + 1 < name.length()) {
        i++;
        sb.append(name.charAt(i));
      } else {
        sb.append(Character.toLowerCase(name.charAt(i)));
      }
      i++;
    }
    this.internalName = sb.toString();
  }

  @Override
  public String toString() {
    // This allows to keep compatibility with old XPath expressions
    return internalName;
  }

}
