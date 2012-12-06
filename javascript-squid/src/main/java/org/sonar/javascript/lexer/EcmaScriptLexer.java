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
import com.sonar.sslr.impl.channel.BlackHoleChannel;
import com.sonar.sslr.impl.channel.IdentifierAndKeywordChannel;
import com.sonar.sslr.impl.channel.PunctuatorChannel;
import com.sonar.sslr.impl.channel.UnknownCharacterChannel;
import org.sonar.javascript.EcmaScriptConfiguration;
import org.sonar.javascript.api.EcmaScriptKeyword;
import org.sonar.javascript.api.EcmaScriptPunctuator;
import org.sonar.javascript.api.EcmaScriptTokenType;

import static com.sonar.sslr.impl.channel.RegexpChannelBuilder.commentRegexp;
import static com.sonar.sslr.impl.channel.RegexpChannelBuilder.regexp;

public final class EcmaScriptLexer {

  private EcmaScriptLexer() {
  }

  private static final String EXP = "([Ee][+-]?+[0-9_]++)";
  private static final String BINARY_EXP = "([Pp][+-]?+[0-9_]++)";

  private static final String FLOAT_SUFFIX = "[fFdD]";
  private static final String INT_SUFFIX = "[lL]";

  public static final String NUMERIC_LITERAL = "(?:"
      // Decimal
      + "[0-9]++\\.([0-9]++)?+" + EXP + "?+" + FLOAT_SUFFIX + "?+"
      // Decimal
      + "|\\.[0-9]++" + EXP + "?+" + FLOAT_SUFFIX + "?+"
      // Decimal
      + "|[0-9]++" + FLOAT_SUFFIX
      + "|[0-9]++" + EXP + FLOAT_SUFFIX + "?+"
      // Hexadecimal
      + "|0[xX][0-9a-fA-F]++\\.[0-9a-fA-F_]*+" + BINARY_EXP + "?+" + FLOAT_SUFFIX + "?+"
      // Hexadecimal
      + "|0[xX][0-9a-fA-F]++" + BINARY_EXP + FLOAT_SUFFIX + "?+"

      // Integer Literals
      // Hexadecimal
      + "|0[xX][0-9a-fA-F]++" + INT_SUFFIX + "?+"
      // Binary (Java 7)
      + "|0[bB][01]++" + INT_SUFFIX + "?+"
      // Decimal and Octal
      + "|[0-9]++" + INT_SUFFIX + "?+"
      + ")";

  public static final String LITERAL = "(?:"
      + "\"([^\"\\\\]*+(\\\\[\\s\\S])?+)*+\""
      + "|'([^'\\\\]*+(\\\\[\\s\\S])?+)*+'"
      + ")";

  public static final String COMMENT = "(?:"
      + "//[^\\n\\r]*+"
      + "|<!--[^\\n\\r]*+"
      + "|/\\*[\\s\\S]*?\\*/"
      + ")";

  public static final String IDENTIFIER = "\\p{javaJavaIdentifierStart}++\\p{javaJavaIdentifierPart}*+";

  /**
   * Tab, Vertical Tab, Form Feed, Space, No-break space, Byte Order Mark
   */
  public static final String WHITESPACE = "[\\t\\u000B\\f\\u0020\\u00A0\\uFEFF\\n\\r]";

  public static Lexer create(EcmaScriptConfiguration conf) {
    return Lexer.builder()
        .withCharset(conf.getCharset())

        .withFailIfNoChannelToConsumeOneCharacter(true)

        // Channels, which consumes more frequently should come first.
        // Whitespace character occurs more frequently than any other, and thus come first:
        .withChannel(new BlackHoleChannel(WHITESPACE + "++"))

        // Comments
        .withChannel(commentRegexp(COMMENT))

        // String Literals
        .withChannel(regexp(GenericTokenType.LITERAL, LITERAL))

        // Regular Expression Literals
        .withChannel(new EcmaScriptRegexpChannel())

        .withChannel(regexp(EcmaScriptTokenType.NUMERIC_LITERAL, NUMERIC_LITERAL))

        .withChannel(new IdentifierAndKeywordChannel(IDENTIFIER, true, EcmaScriptKeyword.values()))
        .withChannel(new PunctuatorChannel(EcmaScriptPunctuator.values()))

        .withChannel(new UnknownCharacterChannel(true))

        .build();
  }
}
