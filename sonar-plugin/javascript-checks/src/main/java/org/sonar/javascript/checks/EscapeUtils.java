/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.checks;

public final class EscapeUtils {

  private EscapeUtils() {
  }

  public static String unescape(String value) {
    StringBuilder result = new StringBuilder();
    StringBuilder escapeSequence = new StringBuilder(4);
    int i = 0;
    while (i < value.length()) {
      char ch = value.charAt(i);
      if (ch == '\\') {
        i++;
        ch = value.charAt(i);
        if (ch == 'u') {
          i = consumeEscapeSequence(i, 4, value, escapeSequence, result);
        } else if (ch == 'x') {
          i = consumeEscapeSequence(i, 2, value, escapeSequence, result);
        } else {
          result.append(unescape(ch));
          i++;
        }
      } else {
        result.append(ch);
        i++;
      }
    }
    return result.toString();
  }

  private static int consumeEscapeSequence(int i, int len, String value, StringBuilder escapeSequence, StringBuilder result) {
    int ii = i;
    while (escapeSequence.length() != len && ii < value.length()) {
      ii++;
      escapeSequence.append(value.charAt(ii));
    }
    if (escapeSequence.length() == len) {
      result.append((char) Integer.parseInt(escapeSequence.toString(), 16));
      escapeSequence.setLength(0);
    }
    ii++;
    return ii;
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
