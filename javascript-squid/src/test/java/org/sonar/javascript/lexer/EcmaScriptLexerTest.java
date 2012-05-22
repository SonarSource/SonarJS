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
package org.sonar.javascript.lexer;

import com.sonar.sslr.api.GenericTokenType;
import com.sonar.sslr.impl.Lexer;
import org.junit.BeforeClass;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptTokenType;

import static com.sonar.sslr.test.lexer.LexerMatchers.hasComment;
import static com.sonar.sslr.test.lexer.LexerMatchers.hasToken;
import static com.sonar.sslr.test.lexer.LexerMatchers.hasTokens;
import static org.junit.Assert.assertThat;

public class EcmaScriptLexerTest {

  private static Lexer lexer;

  @BeforeClass
  public static void init() {
    lexer = EcmaScriptLexer.create();
  }

  @Test
  public void lexRegularExpressionLiteral() throws Exception {
    assertThat("simple", lexer.lex("/a/"), hasToken("/a/", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat("flags", lexer.lex("/a/g"), hasToken("/a/g", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat("escaped slash", lexer.lex("/\\/a/"), hasToken("/\\/a/", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat("ambiguation", lexer.lex("1 / a == 1 / b"), hasTokens("1", "/", "a", "==", "1", "/", "b", "EOF"));
  }

  @Test
  public void lexMultiLinesComment() {
    assertThat(lexer.lex("/* My Comment \n*/"), hasComment("/* My Comment \n*/"));
    assertThat(lexer.lex("/**/"), hasComment("/**/"));
  }

  @Test
  public void lexInlineComment() {
    assertThat(lexer.lex("// My Comment \n new line"), hasComment("// My Comment "));
    assertThat(lexer.lex("//"), hasComment("//"));
  }

  @Test
  public void decimalLiteral() {
    assertThat(lexer.lex("0"), hasToken("0", EcmaScriptTokenType.NUMERIC_LITERAL));
    assertThat(lexer.lex("123"), hasToken("123", EcmaScriptTokenType.NUMERIC_LITERAL));

    assertThat(lexer.lex("123.456"), hasToken("123.456", EcmaScriptTokenType.NUMERIC_LITERAL));

    assertThat(lexer.lex("123.456e+10"), hasToken("123.456e+10", EcmaScriptTokenType.NUMERIC_LITERAL));
    assertThat(lexer.lex("123.456e-10"), hasToken("123.456e-10", EcmaScriptTokenType.NUMERIC_LITERAL));

    assertThat(lexer.lex("123.456E+10"), hasToken("123.456E+10", EcmaScriptTokenType.NUMERIC_LITERAL));
    assertThat(lexer.lex("123.456E-10"), hasToken("123.456E-10", EcmaScriptTokenType.NUMERIC_LITERAL));

    assertThat(lexer.lex(".123"), hasToken(".123", EcmaScriptTokenType.NUMERIC_LITERAL));

    assertThat(lexer.lex(".123e+4"), hasToken(".123e+4", EcmaScriptTokenType.NUMERIC_LITERAL));
    assertThat(lexer.lex(".123e-4"), hasToken(".123e-4", EcmaScriptTokenType.NUMERIC_LITERAL));

    assertThat(lexer.lex(".123E+4"), hasToken(".123E+4", EcmaScriptTokenType.NUMERIC_LITERAL));
    assertThat(lexer.lex(".123E-4"), hasToken(".123E-4", EcmaScriptTokenType.NUMERIC_LITERAL));
  }

  @Test
  public void hexIntegerLiteral() {
    assertThat(lexer.lex("0xFF"), hasToken("0xFF", EcmaScriptTokenType.NUMERIC_LITERAL));
    assertThat(lexer.lex("0XFF"), hasToken("0XFF", EcmaScriptTokenType.NUMERIC_LITERAL));
  }

  @Test
  public void stringLiteral() {
    assertThat("empty", lexer.lex("''"), hasToken("''", GenericTokenType.LITERAL));
    assertThat("empty", lexer.lex("\"\""), hasToken("\"\"", GenericTokenType.LITERAL));

    assertThat(lexer.lex("'hello world'"), hasToken("'hello world'", GenericTokenType.LITERAL));
    assertThat(lexer.lex("\"hello world\""), hasToken("\"hello world\"", GenericTokenType.LITERAL));

    assertThat("escaped single quote", lexer.lex("'\\''"), hasToken("'\\''", GenericTokenType.LITERAL));
    assertThat("escaped double quote", lexer.lex("\"\\\"\""), hasToken("\"\\\"\"", GenericTokenType.LITERAL));

    assertThat("multiline", lexer.lex("'\\\n'"), hasToken("'\\\n'", GenericTokenType.LITERAL));
    assertThat("multiline", lexer.lex("\"\\\n\""), hasToken("\"\\\n\"", GenericTokenType.LITERAL));
  }

  @Test
  public void nullLiteral() {
    assertThat(lexer.lex("null"), hasToken("null", EcmaScriptKeyword.NULL));
  }

  @Test
  public void booleanLiteral() {
    assertThat(lexer.lex("false"), hasToken("false", EcmaScriptKeyword.FALSE));
    assertThat(lexer.lex("true"), hasToken("true", EcmaScriptKeyword.TRUE));
  }

  @Test
  public void identifier() {
    assertThat(lexer.lex("$"), hasToken("$", GenericTokenType.IDENTIFIER));
    assertThat(lexer.lex("_"), hasToken("_", GenericTokenType.IDENTIFIER));
    assertThat(lexer.lex("identifier"), hasToken("identifier", GenericTokenType.IDENTIFIER));
  }

}
