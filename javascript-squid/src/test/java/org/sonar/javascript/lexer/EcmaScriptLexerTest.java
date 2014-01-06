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
package org.sonar.javascript.lexer;

import com.google.common.base.Charsets;
import com.sonar.sslr.api.GenericTokenType;
import com.sonar.sslr.impl.Lexer;
import com.sonar.sslr.impl.channel.BomCharacterChannel;
import org.junit.BeforeClass;
import org.junit.Test;
import org.sonar.javascript.EcmaScriptConfiguration;
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
    lexer = EcmaScriptLexer.create(new EcmaScriptConfiguration(Charsets.UTF_8));
  }

  @Test
  public void lexRegularExpressionLiteral() throws Exception {
    assertThat("simple", lexer.lex("/a/"), hasToken("/a/", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat("flags", lexer.lex("/a/g"), hasToken("/a/g", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat("escaped slash", lexer.lex("/\\/a/"), hasToken("/\\/a/", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat("ambiguation", lexer.lex("1 / a == 1 / b"), hasTokens("1", "/", "a", "==", "1", "/", "b", "EOF"));

    assertRegexp("/[^/]/");
    assertRegexp("/[^\\\\h;m,.\\-:/\\d]+/gi");

    // UnicodeEscapeSequence
    assertRegexp("/\\uFFFF/");
    assertRegexp("/[\\uFFFF]/");
    // Grammar does not allow this, but otherwise we can't lex amplify-1.1.0.js
    assertRegexp("/[\\u37f]/");

    // HexEscapeSequence
    assertRegexp("/\\xFF/");
    assertRegexp("/[\\xFF]/");
  }

  private static void assertRegexp(String regexp) {
    assertThat(lexer.lex(regexp), hasToken(regexp, EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
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
  public void legacy_inline_comments() {
    assertThat(lexer.lex("<!-- My Comment \n new line"), hasComment("<!-- My Comment "));
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
    assertThat(lexer.lex("i42"), hasToken("i42", GenericTokenType.IDENTIFIER));
  }

  @Test
  public void bom() {
    assertThat(lexer.lex(Character.toString((char) BomCharacterChannel.BOM_CHAR)), hasTokens("EOF"));
  }

}
