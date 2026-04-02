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
package org.sonar.plugins.javascript.utils;

public class UnicodeEscape {

  private UnicodeEscape() {
    // utility class
  }

  public static String unicodeEscape(String message) {
    var s = new StringBuilder();
    message
      .chars()
      .forEach(value -> {
        if (value < 32 || value > 127) {
          s.append(String.format("\\u%04d", value));
        } else {
          s.append((char) value);
        }
      });

    return s.toString();
  }
}
