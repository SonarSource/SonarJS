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
package org.sonar.javascript.checks;

public final class EscapeUtils {

  private EscapeUtils() {
  }

  public static String unescape(String value) {
    StringBuilder result = new StringBuilder();
    boolean hadSlash = false;
    boolean inUnicodeEscapeSequence = false;
    boolean inHexEscapeSequence = false;
    StringBuilder escapeSequence = new StringBuilder(4);
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      if (inUnicodeEscapeSequence) {
        escapeSequence.append(ch);
        if (escapeSequence.length() == 4) {
          result.append((char) Integer.parseInt(escapeSequence.toString(), 16));
          escapeSequence.setLength(0);
          inUnicodeEscapeSequence = false;
        }
      } else if (inHexEscapeSequence) {
        escapeSequence.append(ch);
        if (escapeSequence.length() == 2) {
          result.append((char) Integer.parseInt(escapeSequence.toString(), 16));
          escapeSequence.setLength(0);
          inHexEscapeSequence = false;
        }
      } else if (hadSlash) {
        hadSlash = false;
        switch (ch) {
          case 'b':
            result.append('\b');
            break;
          case 't':
            result.append('\t');
            break;
          case 'n':
            result.append('\n');
            break;
          case 'v':
            result.append('\u000B');
            break;
          case 'f':
            result.append('\f');
            break;
          case 'r':
            result.append('\r');
            break;
          case '\"':
            result.append('"');
            break;
          case '\'':
            result.append('\'');
            break;
          case '\\':
            result.append('\\');
            break;
          case 'u':
            inUnicodeEscapeSequence = true;
            break;
          case 'x':
            inHexEscapeSequence = true;
            break;
          default:
            result.append(ch);
            break;
        }
      } else if (ch == '\\') {
        hadSlash = true;
      } else {
        result.append(ch);
      }
    }
    return result.toString();
  }

}
