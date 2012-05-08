/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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

import com.sonar.sslr.impl.Lexer;
import org.junit.BeforeClass;
import org.junit.Test;
import org.sonar.javascript.api.EcmaScriptTokenType;

import static com.sonar.sslr.test.lexer.LexerMatchers.hasComment;
import static com.sonar.sslr.test.lexer.LexerMatchers.hasToken;
import static org.junit.Assert.assertThat;

public class EcmaScriptLexerTest {

  private static Lexer lexer;

  @BeforeClass
  public static void init() {
    lexer = EcmaScriptLexer.create();
  }

  @Test
  public void lexRegularExpressionLiteral() throws Exception {
    assertThat(lexer.lex("/a/"), hasToken("/a/", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat(lexer.lex("/\\a/"), hasToken("/\\a/", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
    assertThat(lexer.lex("/a/g"), hasToken("/a/g", EcmaScriptTokenType.REGULAR_EXPRESSION_LITERAL));
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

}
