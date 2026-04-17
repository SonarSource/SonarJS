/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.javascript.checks;

public final class EscapeUtils {

  private EscapeUtils() {}

  public static String unescape(String value) {
    if (value.indexOf('\\') < 0) {
      return value;
    }

    StringBuilder result = new StringBuilder(value.length());
    int i = 0;
    while (i < value.length()) {
      char ch = value.charAt(i);
      if (ch != '\\') {
        result.append(ch);
        i++;
        continue;
      }

      if (i + 1 == value.length()) {
        result.append(ch);
        break;
      }

      char escaped = value.charAt(i + 1);
      if (escaped == 'u') {
        i = consumeEscapeSequence(i, 4, value, result);
      } else if (escaped == 'x') {
        i = consumeEscapeSequence(i, 2, value, result);
      } else {
        result.append(unescape(escaped));
        i += 2;
      }
    }
    return result.toString();
  }

  private static int consumeEscapeSequence(int i, int len, String value, StringBuilder result) {
    int escapeStart = i;
    int digitsStart = i + 2;
    int digitsEnd = digitsStart + len;

    if (digitsEnd > value.length()) {
      result.append(value, escapeStart, value.length());
      return value.length();
    }

    String escapeSequence = value.substring(digitsStart, digitsEnd);
    if (isHexadecimal(escapeSequence)) {
      result.append((char) Integer.parseInt(escapeSequence, 16));
    } else {
      result.append(value, escapeStart, digitsEnd);
    }

    return digitsEnd;
  }

  private static boolean isHexadecimal(String value) {
    for (int i = 0; i < value.length(); i++) {
      if (Character.digit(value.charAt(i), 16) < 0) {
        return false;
      }
    }
    return true;
  }

  private static char unescape(char ch) {
    final char result;
    switch (ch) {
      case 'b':
        result = '\b';
        break;
      case 't':
        result = '\t';
        break;
      case 'n':
        result = '\n';
        break;
      case 'v':
        result = '\u000B';
        break;
      case 'f':
        result = '\f';
        break;
      case 'r':
        result = '\r';
        break;
      case '\"':
        result = '"';
        break;
      case '\'':
        result = '\'';
        break;
      case '\\':
        result = '\\';
        break;
      default:
        result = ch;
        break;
    }
    return result;
  }
}
