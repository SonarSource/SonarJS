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
package org.sonar.javascript.parser;

import com.sonar.sslr.api.GenericTokenType;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.lexer.EcmaScriptLexer;
import org.sonar.javascript.lexer.EcmaScriptRegexpChannel;
import org.sonar.javascript.model.interfaces.Tree.Kind;
import org.sonar.sslr.grammar.GrammarRuleKey;
import org.sonar.sslr.grammar.LexerlessGrammarBuilder;
import org.sonar.sslr.parser.LexerlessGrammar;

import static org.sonar.javascript.api.EcmaScriptKeyword.CLASS;
import static org.sonar.javascript.api.EcmaScriptKeyword.CONST;
import static org.sonar.javascript.api.EcmaScriptKeyword.DEFAULT;
import static org.sonar.javascript.api.EcmaScriptKeyword.DELETE;
import static org.sonar.javascript.api.EcmaScriptKeyword.EXPORT;
import static org.sonar.javascript.api.EcmaScriptKeyword.EXTENDS;
import static org.sonar.javascript.api.EcmaScriptKeyword.FALSE;
import static org.sonar.javascript.api.EcmaScriptKeyword.FOR;
import static org.sonar.javascript.api.EcmaScriptKeyword.FUNCTION;
import static org.sonar.javascript.api.EcmaScriptKeyword.IF;
import static org.sonar.javascript.api.EcmaScriptKeyword.IMPORT;
import static org.sonar.javascript.api.EcmaScriptKeyword.IN;
import static org.sonar.javascript.api.EcmaScriptKeyword.INSTANCEOF;
import static org.sonar.javascript.api.EcmaScriptKeyword.NEW;
import static org.sonar.javascript.api.EcmaScriptKeyword.NULL;
import static org.sonar.javascript.api.EcmaScriptKeyword.SUPER;
import static org.sonar.javascript.api.EcmaScriptKeyword.THIS;
import static org.sonar.javascript.api.EcmaScriptKeyword.TRUE;
import static org.sonar.javascript.api.EcmaScriptKeyword.TYPEOF;
import static org.sonar.javascript.api.EcmaScriptKeyword.VAR;
import static org.sonar.javascript.api.EcmaScriptKeyword.VOID;
import static org.sonar.javascript.api.EcmaScriptKeyword.YIELD;
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
import static org.sonar.javascript.api.EcmaScriptPunctuator.DOUBLEARROW;
import static org.sonar.javascript.api.EcmaScriptPunctuator.ELLIPSIS;
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
 *
 * Update for support of edition 6 (May 2014)
 * Based on draft <a href="http://people.mozilla.org/~jorendorff/es6-draft.html"></a>
 *
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
  /** ECMAScript 6 **/
  TEMPLATE_LITERAL,
  /** ECMAScript 6 **/
  SUBSTITUTION_TEMPLATE,
  /** ECMAScript 6 **/
  NO_SUBSTITUTION_TEMPLATE,
  /** ECMAScript 6 **/
  TEMPLATE_SUBSTITUTION_TAIL,
  /** ECMAScript 6 **/
  TEMPLATE_HEAD,
  /** ECMAScript 6 **/
  TEMPLATE_SPANS,
  /** ECMAScript 6 **/
  TEMPLATE_TAIL,
  /** ECMAScript 6 **/
  TEMPLATE_MIDDLE_LIST,
  /** ECMAScript 6 **/
  TEMPLATE_MIDDLE,
  /** ECMAScript 6 **/
  TEMPLATE_CHARACTER,
  /** ECMAScript 6 **/
  TEMPLATE_CHARACTERS,
  /** ECMAScript 6 **/
  LINE_CONTINUATION,
  /** ECMAScript 6 **/
  BACKTICK,
  /** ECMAScript 6 **/
  DOLLAR_SIGN,
  /** ECMAScript 6 **/
  BACKSLASH,
  IDENTIFIER_NO_LB,

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
  /** ECMAScript 6 **/
  COVER_INITIALIZED_NAME,
  /** ECMAScript 6 **/
  PROPERTY_DEFINITION,
  PAIR_PROPERTY,
  PROPERTY_NAME,
  MEMBER_EXPRESSION,
  /** ECMAScript 6 **/
  SUPER_MEMBER_EXPRESSION,
  NEW_MEMBER_EXPRESSION,
  NEW_EXPRESSION,
  CALL_EXPRESSION,
  SIMPLE_CALL_EXPRESSION,
  ARGUMENTS,
  /** ECMAScript 6 **/
  ARGUMENTS_LIST,
  LEFT_HAND_SIDE_EXPRESSION,
  LEFT_HAND_SIDE_EXPRESSION_NO_LET,
  LEFT_HAND_SIDE_EXPRESSION_NO_LET_AND_LBRACKET,
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
  /** ECMAScript 6 **/
  ES6_ASSIGNMENT_EXPRESSION,
  ASSIGNMENT_EXPRESSION_NO_IN,
  /** ECMAScript 6 **/
  ES6_ASSIGNMENT_EXPRESSION_NO_IN,
  ASSIGNMENT_OPERATOR,
  EXPRESSION,
  EXPRESSION_NO_LB,
  EXPRESSION_NO_IN,
  /** ECMAScript 6 **/
  ARROW_FUNCTION,
  /** ECMAScript 6 **/
  ARROW_FUNCTION_NO_IN,
  /** ECMAScript 6 **/
  ARROW_PARAMETERS,
  /** ECMAScript 6 **/
  CONCISE_BODY,
  /** ECMAScript 6 **/
  CONCISE_BODY_NO_IN,
  /** ECMAScript 6 **/
  COVER_PARENTHESIZED_EXPRESSION_AND_ARROW_PARAMETER_LIST,
  /** ECMAScript 6 **/
  GENERATOR_EXPRESSION,
  /** ECMAScript 6 **/
  CLASS_EXPRESSION,
  /** ECMAScript 6 **/
  YIELD_EXPRESSION,
  /** ECMAScript 6 **/
  YIELD_EXPRESSION_NO_IN,
  /** ECMAScript 6 **/
  GENERATOR_COMPREHENSION,
  /** ECMAScript 6 **/
  COMPREHENSION,
  /** ECMAScript 6 **/
  COMPREHENSION_TAIL,
  /** ECMAScript 6 **/
  COMPREHENSION_FOR,
  /** ECMAScript 6 **/
  COMPREHENSION_IF,
  /** ECMAScript 6 **/
  ARRAY_COMPREHENSION,
  /** ECMAScript 6 **/
  ARRAY_INITIALIZER,
  /** ECMAScript 6 **/
  ARRAY_INITIALIZER_ELEMENT,
  /** ECMAScript 6 **/
  SPREAD_ELEMENT,
  /** ECMAScript 6 **/
  ELISION,
  /** ECMAScript 6 **/
  ELEMENT_LIST,
  BRACKET_EXPRESSION,
  OBJECT_PROPERTY_ACCESS,
  BINDING_REST_ELEMENT,
  SINGLE_NAME_BINDING,
  BINDING_ELEMENT,
  BINDING_PROPERTY,
  BINDING_ELISION_ELEMENT,
  BINDING_ELEMENT_LIST,
  BINDING_PROPERTY_LIST,
  ARRAY_BINDING_PATTERN,
  OBJECT_BINDING_PATTERN,
  BINDING_PATTERN,

  // A.4 Statements

  STATEMENT,
  STATEMENT_LIST,
  VARIABLE_DECLARATION_LIST,
  VARIABLE_DECLARATION_LIST_NO_IN,
  VARIABLE_DECLARATION,
  VARIABLE_DECLARATION_NO_IN,
  INITIALISER,
  INITIALISER_NO_IN,
  EXPRESSION_STATEMENT,
  ITERATION_STATEMENT,
  FOR_IN_STATEMENT,
  /** ECMAScript 6 **/
  FOR_OF_STATEMENT,
  FOR_STATEMENT,
  /** ECMAScrip 6 **/
  OF,
  /** ECMAScript 6 **/
  FOR_DECLARATION,
  /** ECMAScript 6 **/
  FOR_BINDING,
  RETURN_STATEMENT,
  WITH_STATEMENT,
  CATCH_PARAMETER,
  FINALLY,

  // A.5 Declarations

  DECLARATION,
  FUNCTION_DECLARATION,
  FUNCTION_EXPRESSION,
  FORMAL_PARAMETER_LIST,
  FORMAL_PARAMETER,
  /** ECMAScript 6 **/
  REST_PARAMETER,
  FUNCTION_BODY,
  /** ECMAScript 6 **/
  LEXICAL_DECLARATION,
  /** ECMAScript 6 **/
  LEXICAL_DECLARATION_NO_IN,
  /** ECMAScript 6 **/
  LET,
  /** ECMAScript 6 **/
  LET_OR_CONST,
  /** ECMAScript 6 **/
  BINDING_LIST,
  /** ECMAScript 6 **/
  BINDING_LIST_NO_IN,
  /** ECMAScript 6 **/
  LEXICAL_BINDING,
  /** ECMAScript 6 **/
  LEXICAL_BINDING_NO_IN,
  /** ECMAScript 6 **/
  BINDING_IDENTIFIER_INITIALISER,
  /** ECMAScript 6 **/
  BINDING_IDENTIFIER_INITIALISER_NO_IN,
  /** ECMAScript 6 **/
  BINDING_PATTERN_INITIALISER,
  /** ECMAScript 6 **/
  BINDING_PATTERN_INITIALISER_NO_IN,
  /** ECMAScript 6 **/
  BINDING_IDENTIFIER,
  /** ECMAScript 6 **/
  IDENTIFIER_REFERENCE,
  /** ECMAScript 6 **/
  COMPUTED_PROPERTY_NAME,
  /** ECMAScript 6 **/
  LITERAL_PROPERTY_NAME,
  /** ECMAScript 6 **/
  GENERATOR_METHOD,
  /** ECMAScript 6 **/
  CLASS_DECLARATION,
  /** ECMAScript 6 **/
  CLASS_TAIL,
  /** ECMAScript 6 **/
  CLASS_HERITAGE,
  /** ECMAScript 6 **/
  CLASS_BODY,
  /** ECMAScript 6 **/
  CLASS_ELEMENT,
  /** ECMAScript 6 **/
  STATIC_METHOD_DEFINITION,
  /** ECMAScript 6 **/
  STATIC,
  /** ECMAScript 6 **/
  METHOD_DEFINITION,
  /** ECMAScript 6 **/
  METHOD,
  GETTER_METHOD,
  GET,
  SETTER_METHOD,
  PROPERTY_SET_PARAMETER_LIST,
  SET,
  /** ECMAScript 6 **/
  MODULE_WORD,
  /** ECMAScript 6 **/
  MODULE,
  /** ECMAScript 6 **/
  MODULE_BODY,
  /** ECMAScript 6 **/
  MODULE_ITEM,
  /** ECMAScript 6 **/
  IMPORT_DECLARATION,
  /** ECMAScript 6 **/
  EXPORT_DECLARATION,
  /** ECMAScript 6 **/
  IMPORT_CLAUSE,
  /** ECMAScript 6 **/
  FROM_CLAUSE,
  /** ECMAScript 6 **/
  MODULE_IMPORT,
  /** ECMAScript 6 **/
  NAMED_IMPORTS,
  /** ECMAScript 6 **/
  IMPORTS_LIST,
  /** ECMAScript 6 **/
  IMPORT_SPECIFIER,
  /** ECMAScript 6 **/
  IMPORT_FROM,
  /** ECMAScript 6 **/
  SIMPLE_IMPORT,
  /** ECMAScript 6 **/
  FROM,
  /** ECMAScript 6 **/
  AS,
  /** ECMAScript 6 **/
  EXPORT_LIST_CLAUSE,
  /** ECMAScript 6 **/
  EXPORT_ALL_CLAUSE,
  /** ECMAScript 6 **/
  EXPORT_DEFAULT_CLAUSE,
  /** ECMAScript 6 **/
  EXPORT_CLAUSE,
  /** ECMAScript 6 **/
  EXPORT_LIST,
  /** ECMAScript 6 **/
  EXPORT_SPECIFIER,
  /** ECMAScript 6 **/
  GENERATOR_DECLARATION,

  // A.6 Programs

  SCRIPT,
  SCRIPT_BODY,

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
    declarations(b);
    programs(b);

    b.setRootRule(SCRIPT);

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
    b.rule(IDENTIFIER_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, IDENTIFIER).skip();
    b.rule(NUMERIC_LITERAL).is(
      SPACING,
      b.regexp(EcmaScriptLexer.NUMERIC_LITERAL));
    b.rule(STRING_LITERAL).is(
      SPACING,
      b.token(GenericTokenType.LITERAL, b.regexp(EcmaScriptLexer.LITERAL)));
    b.rule(REGULAR_EXPRESSION_LITERAL).is(
      SPACING,
      b.regexp(EcmaScriptRegexpChannel.REGULAR_EXPRESSION));

    b.rule(TEMPLATE_CHARACTERS).is(b.oneOrMore(TEMPLATE_CHARACTER));
    b.rule(TEMPLATE_CHARACTER).is(b.firstOf(
      b.sequence(DOLLAR_SIGN, b.nextNot(LCURLYBRACE)),
      b.sequence(BACKSLASH, EcmaScriptLexer.WHITESPACE),
      LINE_CONTINUATION,
      LINE_TERMINATOR_SEQUENCE,
      b.regexp("[^`\\$" + EcmaScriptLexer.LINE_TERMINATOR + "]")));
    b.rule(LINE_CONTINUATION).is(BACKSLASH, LINE_TERMINATOR_SEQUENCE);
    b.rule(BACKSLASH).is(character(b, "\\"));
    b.rule(BACKTICK).is(character(b, "`"));
    b.rule(DOLLAR_SIGN).is(character(b, "$"));

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
    punctuator(b, DOUBLEARROW, "=>");
    punctuator(b, DOT, ".");
    punctuator(b, ELLIPSIS, "...");
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
    b.rule(LETTER_OR_DIGIT).is(b.regexp("\\p{javaJavaIdentifierPart}"));
    Object[] rest = new Object[EcmaScriptKeyword.values().length - 2];
    for (int i = 0; i < EcmaScriptKeyword.values().length; i++) {
      EcmaScriptKeyword tokenType = EcmaScriptKeyword.values()[i];
      b.rule(tokenType).is(SPACING, tokenType.getValue(), b.nextNot(LETTER_OR_DIGIT));
      if (i > 1) {
        rest[i - 2] = tokenType.getValue();
      }
    }
    b.rule(KEYWORD).is(b.firstOf(
      EcmaScriptKeyword.keywordValues()[0],
      EcmaScriptKeyword.keywordValues()[1],
      rest), b.nextNot(LETTER_OR_DIGIT));
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
    return b.sequence(SPACING, b.token(GenericTokenType.IDENTIFIER, value), b.nextNot(LETTER_OR_DIGIT));
  }

  private static Object character(LexerlessGrammarBuilder b, String value) {
    return b.sequence(SPACING, value);
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
      // Not IDENTIFIER_REFERENCE, to avoid conflicts with YIELD_EXPRESSION from ASSIGNMENT_EXPRESSION
      IDENTIFIER,
      LITERAL,
      ARRAY_INITIALIZER,
      OBJECT_LITERAL,
      FUNCTION_EXPRESSION,
      // Also covers PARENTHESIZED_EXPRESSION
      COVER_PARENTHESIZED_EXPRESSION_AND_ARROW_PARAMETER_LIST,
      ecmascript6(CLASS_EXPRESSION),
      ecmascript6(GENERATOR_EXPRESSION),
      ecmascript6(GENERATOR_COMPREHENSION),
      ecmascript6(TEMPLATE_LITERAL)));

    b.rule(TEMPLATE_LITERAL).is(b.firstOf(
      NO_SUBSTITUTION_TEMPLATE,
      SUBSTITUTION_TEMPLATE));

    b.rule(NO_SUBSTITUTION_TEMPLATE).is(BACKTICK, b.optional(TEMPLATE_CHARACTERS), BACKTICK);

    b.rule(SUBSTITUTION_TEMPLATE).is(TEMPLATE_HEAD, EXPRESSION, b.optional(TEMPLATE_MIDDLE_LIST), TEMPLATE_TAIL);
    b.rule(TEMPLATE_HEAD).is(BACKTICK, b.optional(TEMPLATE_CHARACTERS), DOLLAR_SIGN, LCURLYBRACE);
    b.rule(TEMPLATE_MIDDLE_LIST).is(b.oneOrMore(TEMPLATE_MIDDLE, EXPRESSION));
    b.rule(TEMPLATE_MIDDLE).is(RCURLYBRACE, b.optional(TEMPLATE_CHARACTERS), DOLLAR_SIGN, LCURLYBRACE);
    b.rule(TEMPLATE_TAIL).is(RCURLYBRACE, b.optional(TEMPLATE_CHARACTERS), BACKTICK);

    b.rule(GENERATOR_COMPREHENSION).is(LPARENTHESIS, COMPREHENSION, RPARENTHESIS);
    b.rule(COMPREHENSION).is(COMPREHENSION_FOR, COMPREHENSION_TAIL);
    b.rule(COMPREHENSION_TAIL).is(b.zeroOrMore(b.firstOf(COMPREHENSION_FOR, COMPREHENSION_IF)), ASSIGNMENT_EXPRESSION);
    b.rule(COMPREHENSION_FOR).is(FOR, LPARENTHESIS, FOR_BINDING, OF, ASSIGNMENT_EXPRESSION, RPARENTHESIS);
    b.rule(COMPREHENSION_IF).is(IF, LPARENTHESIS, ASSIGNMENT_EXPRESSION, RPARENTHESIS);
    b.rule(FOR_BINDING).is(b.firstOf(BINDING_IDENTIFIER, BINDING_PATTERN));

    b.rule(BINDING_PATTERN).is(b.firstOf(OBJECT_BINDING_PATTERN, ARRAY_BINDING_PATTERN));

    b.rule(OBJECT_BINDING_PATTERN).is(LCURLYBRACE, b.optional(BINDING_PROPERTY_LIST, b.optional(COMMA)), RCURLYBRACE);
    b.rule(BINDING_PROPERTY_LIST).is(BINDING_PROPERTY, b.zeroOrMore(COMMA, BINDING_PROPERTY));
    b.rule(BINDING_PROPERTY).is(b.firstOf(
      b.sequence(PROPERTY_NAME, COLON, BINDING_ELEMENT),
      SINGLE_NAME_BINDING));

    b.rule(ARRAY_BINDING_PATTERN).is(
      LBRACKET,
      b.optional(b.firstOf(
        b.sequence(BINDING_ELEMENT_LIST, b.optional(COMMA, b.optional(ELISION), b.optional(BINDING_REST_ELEMENT))),
        b.sequence(b.optional(ELISION), b.optional(BINDING_REST_ELEMENT)))),
      RBRACKET);
    b.rule(BINDING_ELEMENT_LIST).is(BINDING_ELISION_ELEMENT, b.zeroOrMore(COMMA, BINDING_ELISION_ELEMENT));
    b.rule(BINDING_ELISION_ELEMENT).is(b.optional(ELISION), BINDING_ELEMENT);

    b.rule(BINDING_ELEMENT).is(b.firstOf(
      SINGLE_NAME_BINDING,
      b.sequence(BINDING_PATTERN, b.optional(INITIALISER))));
    b.rule(SINGLE_NAME_BINDING).is(BINDING_IDENTIFIER, b.optional(INITIALISER));
    b.rule(BINDING_REST_ELEMENT).is(ELLIPSIS, BINDING_IDENTIFIER);

    b.rule(COVER_PARENTHESIZED_EXPRESSION_AND_ARROW_PARAMETER_LIST).is(
      LPARENTHESIS,
      b.optional(b.firstOf(
        REST_PARAMETER,
        b.sequence(EXPRESSION, b.optional(COMMA, REST_PARAMETER)))),
      RPARENTHESIS);
    b.rule(CLASS_EXPRESSION).is(CLASS, b.optional(BINDING_IDENTIFIER), CLASS_TAIL);
    b.rule(GENERATOR_EXPRESSION).is(FUNCTION, STAR, b.optional(BINDING_IDENTIFIER),
      LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);

    b.rule(ARRAY_INITIALIZER).is(b.firstOf(ARRAY_LITERAL, ecmascript6(ARRAY_COMPREHENSION)));
    b.rule(ARRAY_LITERAL).is(
      LBRACKET,
      b.optional(b.firstOf(
        b.sequence(ELEMENT_LIST, b.optional(COMMA, b.optional(ELISION))),
        ELISION)),
      RBRACKET);

    b.rule(ELEMENT_LIST).is(b.optional(ELISION), ARRAY_INITIALIZER_ELEMENT, b.zeroOrMore(COMMA, b.optional(ELISION), ARRAY_INITIALIZER_ELEMENT));
    b.rule(ARRAY_INITIALIZER_ELEMENT).is(b.firstOf(SPREAD_ELEMENT, ASSIGNMENT_EXPRESSION));
    b.rule(ELISION).is(b.oneOrMore(COMMA));
    b.rule(SPREAD_ELEMENT).is(ELLIPSIS, ASSIGNMENT_EXPRESSION);

    b.rule(ARRAY_COMPREHENSION).is(LBRACKET, COMPREHENSION, RBRACKET);

    b.rule(OBJECT_LITERAL).is(LCURLYBRACE, b.optional(PROPERTY_DEFINITION, b.zeroOrMore(COMMA, PROPERTY_DEFINITION), b.optional(COMMA)), RCURLYBRACE);
    b.rule(PROPERTY_DEFINITION).is(b.firstOf(
      PAIR_PROPERTY,
      METHOD_DEFINITION,
      ecmascript6(COVER_INITIALIZED_NAME)));
    b.rule(COVER_INITIALIZED_NAME).is(IDENTIFIER_REFERENCE, b.optional(INITIALISER));
    b.rule(PAIR_PROPERTY).is(PROPERTY_NAME, COLON, ASSIGNMENT_EXPRESSION);

    b.rule(MEMBER_EXPRESSION).is(
      b.firstOf(
        ecmascript6(SUPER_MEMBER_EXPRESSION),
        NEW_MEMBER_EXPRESSION,
        PRIMARY_EXPRESSION),
      b.zeroOrMore(
        b.firstOf(
          BRACKET_EXPRESSION,
          OBJECT_PROPERTY_ACCESS,
          ecmascript6(TEMPLATE_LITERAL))));
    b.rule(SUPER_MEMBER_EXPRESSION).is(b.sequence(SUPER, b.firstOf(BRACKET_EXPRESSION, OBJECT_PROPERTY_ACCESS)));
    b.rule(NEW_MEMBER_EXPRESSION).is(b.sequence(NEW, b.firstOf(ecmascript6(SUPER), MEMBER_EXPRESSION), ARGUMENTS));
    b.rule(NEW_EXPRESSION).is(b.firstOf(
      MEMBER_EXPRESSION,
      ecmascript6(b.sequence(NEW, SUPER)),
      b.sequence(NEW, NEW_EXPRESSION)));

    b.rule(CALL_EXPRESSION).is(
      b.firstOf(
        SIMPLE_CALL_EXPRESSION,
        ecmascript6(TEMPLATE_LITERAL)),
      b.zeroOrMore(b.firstOf(
        ARGUMENTS,
        BRACKET_EXPRESSION,
        OBJECT_PROPERTY_ACCESS)));
    b.rule(BRACKET_EXPRESSION).is(LBRACKET, EXPRESSION, RBRACKET);
    b.rule(OBJECT_PROPERTY_ACCESS).is(DOT, IDENTIFIER_NAME);
    b.rule(SIMPLE_CALL_EXPRESSION).is(b.firstOf(MEMBER_EXPRESSION, ecmascript6(SUPER)), ARGUMENTS);
    b.rule(ARGUMENTS).is(LPARENTHESIS, b.optional(ARGUMENTS_LIST), RPARENTHESIS);
    b.rule(ARGUMENTS_LIST).is(b.optional(ELLIPSIS), ASSIGNMENT_EXPRESSION, b.zeroOrMore(COMMA, b.optional(ELLIPSIS), ASSIGNMENT_EXPRESSION));
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

    b.rule(ES6_ASSIGNMENT_EXPRESSION).is(b.firstOf(YIELD_EXPRESSION, ARROW_FUNCTION));
    b.rule(ES6_ASSIGNMENT_EXPRESSION_NO_IN).is(b.firstOf(YIELD_EXPRESSION_NO_IN, ARROW_FUNCTION_NO_IN));

    b.rule(ASSIGNMENT_EXPRESSION).is(b.firstOf(
      b.sequence(LEFT_HAND_SIDE_EXPRESSION, ASSIGNMENT_OPERATOR, ASSIGNMENT_EXPRESSION),
      // For performance reasons, call CONDITIONAL_EXPRESSION
      b.sequence(
        CONDITIONAL_EXPRESSION,
        // Negative lookahead to prevent conflicts with ES6_ASSIGNMENT_EXPRESSION
        b.nextNot(
          b.regexp("(?:[" + EcmaScriptLexer.WHITESPACE + "]|" + EcmaScriptLexer.SINGLE_LINE_COMMENT + "|" + EcmaScriptLexer.MULTI_LINE_COMMENT_NO_LB + ")*+"),
          "=>")),
      // Assignment_expression_no_yield might be needed, because of identifier_reference that can be "yield" (see ES6 spec).
      ecmascript6(ES6_ASSIGNMENT_EXPRESSION)
      )).skipIfOneChild();
    b.rule(ASSIGNMENT_EXPRESSION_NO_IN).is(b.firstOf(
      b.sequence(LEFT_HAND_SIDE_EXPRESSION, ASSIGNMENT_OPERATOR, ASSIGNMENT_EXPRESSION_NO_IN),
      ecmascript6(ES6_ASSIGNMENT_EXPRESSION_NO_IN),
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
      OR_EQU)).skip();

    b.rule(YIELD_EXPRESSION).is(YIELD, b.optional(/* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, b.optional(STAR), ASSIGNMENT_EXPRESSION));
    b.rule(YIELD_EXPRESSION_NO_IN).is(YIELD, b.optional(/* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, b.optional(STAR), ASSIGNMENT_EXPRESSION_NO_IN));

    b.rule(ARROW_FUNCTION).is(ARROW_PARAMETERS, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, DOUBLEARROW, CONCISE_BODY);
    b.rule(ARROW_FUNCTION_NO_IN).is(ARROW_PARAMETERS, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, DOUBLEARROW, CONCISE_BODY_NO_IN);
    b.rule(ARROW_PARAMETERS).is(b.firstOf(BINDING_IDENTIFIER, COVER_PARENTHESIZED_EXPRESSION_AND_ARROW_PARAMETER_LIST));

    b.rule(CONCISE_BODY).is(b.firstOf(
      b.sequence(LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE),
      b.sequence(b.nextNot(LCURLYBRACE), ASSIGNMENT_EXPRESSION)));
    b.rule(CONCISE_BODY_NO_IN).is(b.firstOf(
      b.sequence(LPARENTHESIS, FUNCTION_BODY, RCURLYBRACE),
      b.sequence(b.nextNot(LCURLYBRACE), ASSIGNMENT_EXPRESSION_NO_IN)));

    b.rule(EXPRESSION).is(ASSIGNMENT_EXPRESSION, b.zeroOrMore(COMMA, ASSIGNMENT_EXPRESSION));
    b.rule(EXPRESSION_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, EXPRESSION).skip();
    b.rule(EXPRESSION_NO_IN).is(ASSIGNMENT_EXPRESSION_NO_IN, b.zeroOrMore(COMMA, ASSIGNMENT_EXPRESSION_NO_IN));
  }

  /**
   * A.4 Statement
   */
  private static void statements(LexerlessGrammarBuilder b) {
    b.rule(STATEMENT).is(b.firstOf(
      Kind.BLOCK,
      Kind.VARIABLE_STATEMENT,
      Kind.EMPTY_STATEMENT,
      Kind.LABELLED_STATEMENT,
      EXPRESSION_STATEMENT,
      Kind.IF_STATEMENT,
      ITERATION_STATEMENT,
      Kind.CONTINUE_STATEMENT,
      Kind.BREAK_STATEMENT,
      Kind.RETURN_STATEMENT,
      Kind.WITH_STATEMENT,
      Kind.SWITCH_STATEMENT,
      Kind.THROW_STATEMENT,
      Kind.TRY_STATEMENT,
      Kind.DEBUGGER_STATEMENT));
    b.rule(STATEMENT_LIST).is(b.oneOrMore(b.firstOf(ecmascript6(DECLARATION), STATEMENT)));
    b.rule(VARIABLE_DECLARATION_LIST_NO_IN).is(VARIABLE_DECLARATION_NO_IN, b.zeroOrMore(COMMA, VARIABLE_DECLARATION_NO_IN));
    b.rule(VARIABLE_DECLARATION_NO_IN).is(b.firstOf(BINDING_IDENTIFIER_INITIALISER_NO_IN, BINDING_PATTERN_INITIALISER_NO_IN));
    b.rule(INITIALISER).is(EQU, ASSIGNMENT_EXPRESSION);
    b.rule(INITIALISER_NO_IN).is(EQU, ASSIGNMENT_EXPRESSION_NO_IN);
    b.rule(EXPRESSION_STATEMENT).is(b.nextNot(b.firstOf(LCURLYBRACE, FUNCTION)), EXPRESSION, EOS);
    b.rule(CONDITION).is(EXPRESSION);
    b.rule(ITERATION_STATEMENT).is(b.firstOf(
      Kind.DO_WHILE_STATEMENT,
      Kind.WHILE_STATEMENT,
      FOR_IN_STATEMENT,
      ecmascript6(FOR_OF_STATEMENT),
      FOR_STATEMENT));
    b.rule(FOR_IN_STATEMENT).is(
      FOR, LPARENTHESIS,
      b.firstOf(
        b.sequence(VAR, b.firstOf(VARIABLE_DECLARATION_LIST_NO_IN, ecmascript6(FOR_BINDING))),
        LEFT_HAND_SIDE_EXPRESSION_NO_LET_AND_LBRACKET,
        ecmascript6(FOR_DECLARATION)),
      IN, EXPRESSION, RPARENTHESIS, STATEMENT);
    b.rule(LEFT_HAND_SIDE_EXPRESSION_NO_LET_AND_LBRACKET).is(ecmascript6(b.nextNot(LET, LBRACKET)), LEFT_HAND_SIDE_EXPRESSION).skip();
    b.rule(FOR_OF_STATEMENT).is(
      FOR, LPARENTHESIS,
      b.firstOf(
        b.sequence(VAR, FOR_BINDING),
        LEFT_HAND_SIDE_EXPRESSION_NO_LET,
        FOR_DECLARATION),
      OF, ASSIGNMENT_EXPRESSION, RPARENTHESIS, STATEMENT);
    b.rule(LEFT_HAND_SIDE_EXPRESSION_NO_LET).is(b.nextNot(LET), LEFT_HAND_SIDE_EXPRESSION).skip();
    b.rule(FOR_DECLARATION).is(LET_OR_CONST, FOR_BINDING);
    b.rule(OF).is(word(b, "of"));
    b.rule(FOR_STATEMENT).is(
      FOR, LPARENTHESIS,
      b.firstOf(
        b.sequence(VAR, VARIABLE_DECLARATION_LIST_NO_IN),
        ecmascript6(b.sequence(LEXICAL_DECLARATION_NO_IN, b.optional(EXPRESSION_NO_IN))),
        b.optional(ecmascript6(b.nextNot(LET, LBRACKET)), EXPRESSION_NO_IN)),
      SEMI, b.optional(CONDITION), SEMI, b.optional(EXPRESSION), RPARENTHESIS, STATEMENT);
    b.rule(CATCH_PARAMETER).is(b.firstOf(BINDING_IDENTIFIER, BINDING_PATTERN));
  }

  /**
   * A.5 Declarations
   */
  private static void declarations(LexerlessGrammarBuilder b) {
    b.rule(MODULE).is(MODULE_BODY);
    b.rule(MODULE_BODY).is(b.oneOrMore(MODULE_ITEM));
    b.rule(MODULE_ITEM).is(b.firstOf(IMPORT_DECLARATION, EXPORT_DECLARATION, DECLARATION, STATEMENT));
    b.rule(EXPORT_DECLARATION).is(
      EXPORT,
      b.firstOf(
        EXPORT_ALL_CLAUSE,
        EXPORT_LIST_CLAUSE,
        Kind.VARIABLE_STATEMENT,
        DECLARATION,
        EXPORT_DEFAULT_CLAUSE));

    b.rule(EXPORT_ALL_CLAUSE).is(STAR, FROM_CLAUSE, EOS);
    b.rule(EXPORT_DEFAULT_CLAUSE).is(DEFAULT, ASSIGNMENT_EXPRESSION, EOS);
    b.rule(EXPORT_LIST_CLAUSE).is(EXPORT_CLAUSE, b.optional(FROM_CLAUSE), EOS);
    b.rule(EXPORT_CLAUSE).is(LCURLYBRACE, b.optional(EXPORT_LIST, b.optional(COMMA)), RCURLYBRACE);
    b.rule(EXPORT_LIST).is(EXPORT_SPECIFIER, b.zeroOrMore(COMMA, EXPORT_SPECIFIER));
    b.rule(EXPORT_SPECIFIER).is(
      b.firstOf(
        IDENTIFIER_REFERENCE,
        IDENTIFIER_NAME),
      b.optional(AS, IDENTIFIER_NAME));

    b.rule(IMPORT_DECLARATION).is(b.firstOf(
      MODULE_IMPORT,
      SIMPLE_IMPORT,
      IMPORT_FROM));

    b.rule(MODULE_IMPORT).is(MODULE_WORD, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, BINDING_IDENTIFIER, FROM_CLAUSE, EOS);
    b.rule(MODULE_WORD).is(word(b, "module"));
    b.rule(SIMPLE_IMPORT).is(IMPORT, STRING_LITERAL, EOS);
    b.rule(IMPORT_FROM).is(IMPORT, IMPORT_CLAUSE, FROM_CLAUSE, EOS);

    b.rule(FROM_CLAUSE).is(FROM, STRING_LITERAL);
    b.rule(FROM).is(word(b, "from"));
    b.rule(IMPORT_CLAUSE).is(b.firstOf(
      NAMED_IMPORTS,
      b.sequence(BINDING_IDENTIFIER, b.optional(COMMA, NAMED_IMPORTS))));
    b.rule(NAMED_IMPORTS).is(LCURLYBRACE, b.optional(IMPORTS_LIST, b.optional(COMMA)), RCURLYBRACE);
    b.rule(IMPORTS_LIST).is(IMPORT_SPECIFIER, b.zeroOrMore(COMMA, IMPORT_SPECIFIER));
    b.rule(IMPORT_SPECIFIER).is(b.optional(IDENTIFIER_NAME, AS), BINDING_IDENTIFIER);
    b.rule(AS).is(word(b, "as"));

    b.rule(DECLARATION).is(b.firstOf(
      FUNCTION_DECLARATION,
      ecmascript6(GENERATOR_DECLARATION),
      ecmascript6(CLASS_DECLARATION),
      ecmascript6(LEXICAL_DECLARATION)));

    b.rule(FUNCTION_DECLARATION).is(FUNCTION, IDENTIFIER, LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);
    b.rule(FUNCTION_EXPRESSION).is(FUNCTION, b.optional(IDENTIFIER), LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);
    b.rule(FORMAL_PARAMETER_LIST).is(b.firstOf(
      b.sequence(FORMAL_PARAMETER, b.zeroOrMore(COMMA, FORMAL_PARAMETER), ecmascript6(b.optional(COMMA, REST_PARAMETER))),
      ecmascript6(REST_PARAMETER)));
    b.rule(REST_PARAMETER).is(BINDING_REST_ELEMENT);
    b.rule(FORMAL_PARAMETER).is(BINDING_ELEMENT);

    b.rule(FUNCTION_BODY).is(b.optional(STATEMENT_LIST));

    b.rule(GENERATOR_DECLARATION).is(FUNCTION, STAR, BINDING_IDENTIFIER,
      LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);

    b.rule(LEXICAL_DECLARATION).is(LET_OR_CONST, BINDING_LIST);
    b.rule(LEXICAL_DECLARATION_NO_IN).is(LET_OR_CONST, BINDING_LIST_NO_IN);
    b.rule(LET_OR_CONST).is(b.firstOf(LET, CONST));
    b.rule(LET).is(word(b, "let"));
    b.rule(BINDING_LIST).is(LEXICAL_BINDING, b.zeroOrMore(COMMA, LEXICAL_BINDING));
    b.rule(BINDING_LIST_NO_IN).is(LEXICAL_BINDING_NO_IN, b.zeroOrMore(COMMA, LEXICAL_BINDING_NO_IN));
    b.rule(LEXICAL_BINDING).is(b.firstOf(BINDING_IDENTIFIER_INITIALISER, BINDING_PATTERN_INITIALISER));
    b.rule(LEXICAL_BINDING_NO_IN).is(b.firstOf(BINDING_IDENTIFIER_INITIALISER_NO_IN, BINDING_PATTERN_INITIALISER_NO_IN));
    b.rule(BINDING_IDENTIFIER_INITIALISER).is(BINDING_IDENTIFIER, b.optional(INITIALISER));
    b.rule(BINDING_IDENTIFIER_INITIALISER_NO_IN).is(BINDING_IDENTIFIER, b.optional(INITIALISER_NO_IN));
    b.rule(BINDING_PATTERN_INITIALISER).is(BINDING_PATTERN, INITIALISER);
    b.rule(BINDING_PATTERN_INITIALISER_NO_IN).is(BINDING_PATTERN, INITIALISER_NO_IN);
    b.rule(BINDING_IDENTIFIER).is(b.firstOf(ecmascript6(DEFAULT), ecmascript6(YIELD), IDENTIFIER));
    b.rule(IDENTIFIER_REFERENCE).is(b.firstOf(YIELD, IDENTIFIER));

    b.rule(CLASS_DECLARATION).is(CLASS, BINDING_IDENTIFIER, CLASS_TAIL);

    b.rule(CLASS_TAIL).is(b.optional(CLASS_HERITAGE), LCURLYBRACE, b.optional(CLASS_BODY), RCURLYBRACE);
    b.rule(CLASS_HERITAGE).is(EXTENDS, LEFT_HAND_SIDE_EXPRESSION);

    b.rule(CLASS_BODY).is(b.oneOrMore(CLASS_ELEMENT));
    b.rule(CLASS_ELEMENT).is(b.firstOf(STATIC_METHOD_DEFINITION, METHOD_DEFINITION, SEMI));

    b.rule(STATIC_METHOD_DEFINITION).is(STATIC, METHOD_DEFINITION);
    b.rule(STATIC).is(word(b, "static"));
    b.rule(METHOD_DEFINITION).is(b.firstOf(ecmascript6(METHOD), ecmascript6(GENERATOR_METHOD), GETTER_METHOD, SETTER_METHOD));
    b.rule(METHOD).is(PROPERTY_NAME, LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);
    b.rule(SETTER_METHOD).is(b.sequence(SET, PROPERTY_NAME, LPARENTHESIS, PROPERTY_SET_PARAMETER_LIST, RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE));
    b.rule(PROPERTY_SET_PARAMETER_LIST).is(FORMAL_PARAMETER);
    b.rule(SET).is(word(b, "set"));
    b.rule(GETTER_METHOD).is(b.sequence(GET, PROPERTY_NAME, LPARENTHESIS, RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE));
    b.rule(GET).is(word(b, "get"));
    b.rule(GENERATOR_METHOD).is(STAR, PROPERTY_NAME, LPARENTHESIS, b.optional(FORMAL_PARAMETER_LIST), RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);

    b.rule(PROPERTY_NAME).is(b.firstOf(LITERAL_PROPERTY_NAME, ecmascript6(COMPUTED_PROPERTY_NAME)));
    b.rule(LITERAL_PROPERTY_NAME).is(b.firstOf(IDENTIFIER_NAME, STRING_LITERAL, NUMERIC_LITERAL));
    b.rule(COMPUTED_PROPERTY_NAME).is(LBRACKET, ASSIGNMENT_EXPRESSION, RBRACKET);
  }

  /**
   * A.6 Programs
   */
  private static void programs(LexerlessGrammarBuilder b) {
    b.rule(SCRIPT).is(b.optional(SHEBANG), b.optional(MODULE_BODY), SPACING, EOF);

    b.rule(SHEBANG).is("#!", b.regexp("[^\\n\\r]*+")).skip();
  }

  /**
   * Declares constructs supported since ECMAScript 6.
   * Based on draft <a href="http://people.mozilla.org/~jorendorff/es6-draft.html"></a>
   */
  private static Object ecmascript6(Object object) {
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
