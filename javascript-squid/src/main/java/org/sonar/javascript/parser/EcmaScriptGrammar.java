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

import static org.sonar.javascript.api.EcmaScriptKeyword.CONST;
import static org.sonar.javascript.api.EcmaScriptKeyword.DEFAULT;
import static org.sonar.javascript.api.EcmaScriptKeyword.EXPORT;
import static org.sonar.javascript.api.EcmaScriptKeyword.FUNCTION;
import static org.sonar.javascript.api.EcmaScriptKeyword.IMPORT;
import static org.sonar.javascript.api.EcmaScriptKeyword.VAR;
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

  // A.1 Lexical

  LITERAL,
  NULL_LITERAL,
  BOOLEAN_LITERAL,
  STRING_LITERAL,
  /** ECMAScript 6 **/
  TEMPLATE_SPANS,
  /** ECMAScript 6 **/
  TEMPLATE_CHARACTER,
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
  SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK,
  SPACING,

  /**
   * Spacing without line break.
   */
  SPACING_NO_LB,
  NEXT_NOT_LB,
  LINE_TERMINATOR_SEQUENCE,

  // A.3 Expressions

  PRIMARY_EXPRESSION,
  /** ECMAScript 6 **/
  PROPERTY_DEFINITION,
  PROPERTY_NAME,
  MEMBER_EXPRESSION,
  ARGUMENTS_LIST,
  LEFT_HAND_SIDE_EXPRESSION,
  POSTFIX_EXPRESSION,
  UNARY_EXPRESSION,
  MULTIPLICATIVE_EXPRESSION,
  ADDITIVE_EXPRESSION,
  SHIFT_EXPRESSION,
  RELATIONAL_EXPRESSION,
  EQUALITY_EXPRESSION,
  BITWISE_AND_EXPRESSION,
  BITWISE_XOR_EXPRESSION,
  BITWISE_OR_EXPRESSION,
  LOGICAL_AND_EXPRESSION,
  LOGICAL_OR_EXPRESSION,
  ASSIGNMENT_EXPRESSION,
  ASSIGNMENT_EXPRESSION_NO_IN,
  ASSIGNMENT_OPERATOR,
  EXPRESSION,
  EXPRESSION_NO_LB,
  EXPRESSION_NO_IN,
  /** ECMAScript 6 **/
  ARROW_FUNCTION,
  /** ECMAScript 6 **/
  GENERATOR_EXPRESSION,
  /** ECMAScript 6 **/
  ARRAY_LITERAL_ELEMENT,
  /** ECMAScript 6 **/
  SPREAD_ELEMENT,
  /** ECMAScript 6 **/
  ELISION,
  /** ECMAScript 6 **/
  ELEMENT_LIST,
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
  ITERATION_STATEMENT,
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
  FORMAL_PARAMETER,
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
  IDENTIFIER_REFERENCE,
  /** ECMAScript 6 **/
  BINDING_IDENTIFIER,
  /** ECMAScript 6 **/
  GENERATOR_METHOD,
  /** ECMAScript 6 **/
  CLASS_DECLARATION,
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
  GENERATOR_DECLARATION,

  // A.6 Programs

  SCRIPT,
  SCRIPT_BODY,

  SHEBANG,

  // Temporary rules for migration
  LEFT_HAND_SIDE_EXPRESSION_NO_LET_AND_LBRACKET,
  LEFT_HAND_SIDE_EXPRESSION_NO_LET,
  EXPRESSION_NO_LCURLY_AND_FUNCTION,
  EXPRESSION_NO_IN_NO_LET_AND_BRACKET,
  INC_NO_LB,
  DEC_NO_LB,
  FOR_VAR_DECLARATION,
  STAR_NO_LB,
  ASSIGNMENT_EXPRESSION_NO_LB,
  ASSIGNMENT_EXPRESSION_NO_IN_NO_LB,
  ASSIGNMENT_EXPRESSION_NO_LCURLY,
  ASSIGNMENT_EXPRESSION_NO_IN_NO_LCURLY,
  DOUBLEARROW_NO_LB,
  CONDITIONAL_EXPRESSION_LOOKAHEAD,
  NOT_FUNCTION_AND_CLASS;

  public static LexerlessGrammar createGrammar() {
    return createGrammarBuilder().build();
  }

  public static LexerlessGrammarBuilder createGrammarBuilder() {
    LexerlessGrammarBuilder b = LexerlessGrammarBuilder.create();

    b.rule(IDENTIFIER_NAME).is(
      SPACING,
      b.regexp(EcmaScriptLexer.IDENTIFIER));

    lexical(b);
    expressions(b);
    statements(b);
    module_declaration(b);
    lexical_var_and_destructuring_declarations(b);
    class_and_function_declarations(b);
    programs(b);

    b.setRootRule(SCRIPT);

    return b;
  }

  /**
   * A.1 Lexical
   */
  private static void lexical(LexerlessGrammarBuilder b) {
    b.rule(SPACING_NO_LINE_BREAK_NOT_FOLLOWED_BY_LINE_BREAK).is(SPACING_NO_LB, NEXT_NOT_LB);

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
    b.rule(IDENTIFIER_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, Kind.LABEL_IDENTIFIER).skip();
    b.rule(NUMERIC_LITERAL).is(
      SPACING,
      b.regexp(EcmaScriptLexer.NUMERIC_LITERAL));
    b.rule(STRING_LITERAL).is(
      SPACING,
      b.token(GenericTokenType.LITERAL, b.regexp(EcmaScriptLexer.LITERAL)));
    b.rule(REGULAR_EXPRESSION_LITERAL).is(
      SPACING,
      b.regexp(EcmaScriptRegexpChannel.REGULAR_EXPRESSION));

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
    b.rule(ELISION).is(b.oneOrMore(COMMA));

    b.rule(EXPRESSION_NO_IN).is(ASSIGNMENT_EXPRESSION_NO_IN, b.zeroOrMore(COMMA, ASSIGNMENT_EXPRESSION_NO_IN));

    // Temporary rules
    b.rule(DOUBLEARROW_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, DOUBLEARROW);
    b.rule(INC_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, INC);
    b.rule(DEC_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, DEC);
    b.rule(STAR_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, STAR);
    b.rule(ASSIGNMENT_EXPRESSION_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, ASSIGNMENT_EXPRESSION);
    b.rule(ASSIGNMENT_EXPRESSION_NO_IN_NO_LB).is(SPACING_NO_LB, NEXT_NOT_LB, ASSIGNMENT_EXPRESSION_NO_IN);
    b.rule(ASSIGNMENT_EXPRESSION_NO_LCURLY).is(b.nextNot(LCURLYBRACE), ASSIGNMENT_EXPRESSION);
    b.rule(ASSIGNMENT_EXPRESSION_NO_IN_NO_LCURLY).is(b.nextNot(LCURLYBRACE), ASSIGNMENT_EXPRESSION_NO_IN);
    b.rule(CONDITIONAL_EXPRESSION_LOOKAHEAD).is(Kind.CONDITIONAL_EXPRESSION,
      // Negative lookahead to prevent conflicts with ES6_ASSIGNMENT_EXPRESSION
      b.nextNot(
        b.regexp("(?:[" + EcmaScriptLexer.WHITESPACE + "]|" + EcmaScriptLexer.SINGLE_LINE_COMMENT + "|" + EcmaScriptLexer.MULTI_LINE_COMMENT_NO_LB + ")*+"),
        "=>")).skip();
  }

  /**
   * A.4 Statement
   */
  private static void statements(LexerlessGrammarBuilder b) {
    b.rule(STATEMENT_LIST).is(b.oneOrMore(b.firstOf(ecmascript6(DECLARATION), STATEMENT)));
    b.rule(VARIABLE_DECLARATION_LIST_NO_IN).is(VARIABLE_DECLARATION_NO_IN, b.zeroOrMore(COMMA, VARIABLE_DECLARATION_NO_IN));
    b.rule(VARIABLE_DECLARATION_NO_IN).is(b.firstOf(BINDING_IDENTIFIER_INITIALISER_NO_IN, BINDING_PATTERN_INITIALISER_NO_IN));

    b.rule(FOR_DECLARATION).is(b.firstOf(VAR, LET_OR_CONST), FOR_BINDING);
    b.rule(OF).is(word(b, "of"));

    b.rule(CATCH_PARAMETER).is(b.firstOf(BINDING_IDENTIFIER, BINDING_PATTERN));

    // Temporary rules waiting for b.nextNot method migration
    b.rule(LEFT_HAND_SIDE_EXPRESSION_NO_LET_AND_LBRACKET).is(ecmascript6(b.nextNot(LET, LBRACKET)), LEFT_HAND_SIDE_EXPRESSION).skip();
    b.rule(LEFT_HAND_SIDE_EXPRESSION_NO_LET).is(b.nextNot(LET), LEFT_HAND_SIDE_EXPRESSION).skip();
    b.rule(EXPRESSION_NO_LCURLY_AND_FUNCTION).is(b.nextNot(b.firstOf(LCURLYBRACE, FUNCTION)), EXPRESSION).skip();
    b.rule(EXPRESSION_NO_IN_NO_LET_AND_BRACKET).is(ecmascript6(b.nextNot(LET, LBRACKET)), EXPRESSION_NO_IN).skip();
    b.rule(FOR_VAR_DECLARATION).is(VAR, VARIABLE_DECLARATION_LIST_NO_IN);

  }

  /**
   * A.5 Declarations
   */
  private static void module_declaration(LexerlessGrammarBuilder b) {
    b.rule(MODULE).is(MODULE_BODY);
    b.rule(MODULE_BODY).is(b.oneOrMore(MODULE_ITEM));
    b.rule(MODULE_ITEM).is(b.firstOf(IMPORT_DECLARATION, EXPORT_DECLARATION, DECLARATION, STATEMENT));

    b.rule(IMPORT_DECLARATION).is(b.firstOf(
      MODULE_IMPORT,
      SIMPLE_IMPORT,
      IMPORT_FROM));

    // FIXME: update import & export declaration according to last ES6 specification draft
    b.rule(MODULE_IMPORT).is(MODULE_WORD, /* no line terminator here */SPACING_NO_LB, NEXT_NOT_LB, BINDING_IDENTIFIER, Kind.FROM_CLAUSE, EOS);
    b.rule(MODULE_WORD).is(word(b, "module"));
    b.rule(SIMPLE_IMPORT).is(IMPORT, Kind.STRING_LITERAL, EOS);
    b.rule(IMPORT_FROM).is(IMPORT, IMPORT_CLAUSE, Kind.FROM_CLAUSE, EOS);

    b.rule(FROM).is(word(b, "from"));
    b.rule(IMPORT_CLAUSE).is(b.firstOf(
      NAMED_IMPORTS,
      b.sequence(BINDING_IDENTIFIER, b.optional(COMMA, NAMED_IMPORTS))));
    b.rule(NAMED_IMPORTS).is(LCURLYBRACE, b.optional(IMPORTS_LIST, b.optional(COMMA)), RCURLYBRACE);
    b.rule(IMPORTS_LIST).is(IMPORT_SPECIFIER, b.zeroOrMore(COMMA, IMPORT_SPECIFIER));
    b.rule(IMPORT_SPECIFIER).is(b.optional(IDENTIFIER_NAME, AS), BINDING_IDENTIFIER);
    b.rule(AS).is(word(b, "as"));

    // Temporary rules
    b.rule(NOT_FUNCTION_AND_CLASS).is(b.nextNot(EcmaScriptKeyword.FUNCTION, EcmaScriptKeyword.CLASS));
  }

  private static void lexical_var_and_destructuring_declarations(LexerlessGrammarBuilder b) {
    b.rule(DECLARATION).is(b.firstOf(
      FUNCTION_DECLARATION,
      ecmascript6(GENERATOR_DECLARATION),
      ecmascript6(CLASS_DECLARATION),
      ecmascript6(LEXICAL_DECLARATION)));

    b.rule(LEXICAL_DECLARATION).is(LET_OR_CONST, BINDING_LIST, EOS);
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
    b.rule(INITIALISER).is(EQU, ASSIGNMENT_EXPRESSION);
    b.rule(INITIALISER_NO_IN).is(EQU, ASSIGNMENT_EXPRESSION_NO_IN);

  }

  private static void class_and_function_declarations(LexerlessGrammarBuilder b) {
    b.rule(FUNCTION_DECLARATION).is(FUNCTION, BINDING_IDENTIFIER, Kind.FORMAL_PARAMETER_LIST, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);

    b.rule(FUNCTION_BODY).is(b.optional(STATEMENT_LIST));

    b.rule(GENERATOR_DECLARATION).is(FUNCTION, STAR, BINDING_IDENTIFIER,
      Kind.FORMAL_PARAMETER_LIST, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);

    b.rule(CLASS_ELEMENT).is(b.firstOf(STATIC_METHOD_DEFINITION, METHOD_DEFINITION, SEMI));

    b.rule(STATIC_METHOD_DEFINITION).is(STATIC, METHOD_DEFINITION);
    b.rule(STATIC).is(word(b, "static"));
    b.rule(METHOD_DEFINITION).is(b.firstOf(ecmascript6(METHOD), ecmascript6(GENERATOR_METHOD), GETTER_METHOD, SETTER_METHOD));
    b.rule(METHOD).is(PROPERTY_NAME, Kind.FORMAL_PARAMETER_LIST, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);
    b.rule(SETTER_METHOD).is(b.sequence(SET, PROPERTY_NAME, LPARENTHESIS, PROPERTY_SET_PARAMETER_LIST, RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE));
    b.rule(PROPERTY_SET_PARAMETER_LIST).is(BINDING_ELEMENT);
    b.rule(SET).is(word(b, "set"));
    b.rule(GETTER_METHOD).is(b.sequence(GET, PROPERTY_NAME, LPARENTHESIS, RPARENTHESIS, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE));
    b.rule(GET).is(word(b, "get"));
    b.rule(GENERATOR_METHOD).is(STAR, PROPERTY_NAME, Kind.FORMAL_PARAMETER_LIST, LCURLYBRACE, FUNCTION_BODY, RCURLYBRACE);
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
