/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.filter;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.stream.Collectors;
import org.sonar.api.batch.fs.InputFile;

/**
 * An instance of this class computes the average line length of file.
 * Before making the computation, it discards all lines which are part
 * of the header comment.
 * The header comment is a comment which starts on the first line of the file.
 * It may be either a C-like comment (i.e., it starts with <code>"/*"</code>) or a C++-like comment
 * (i.e., it starts with <code>"//"</code>).
 */
class AverageLineLengthCalculator {

  private InputFile file;

  private boolean isAtFirstLine = true;

  private boolean isInHeaderComment = false;

  private boolean isClike = false;

  public AverageLineLengthCalculator(InputFile file) {
    this.file = file;
  }

  public int getAverageLineLength() {
    long nbLines = 0;
    long nbCharacters = 0;

    List<String> lines = readLines(file);

    for (String line : lines) {
      if (!isLineInHeaderComment(line)) {
        nbLines++;
        nbCharacters += line.length();
      }
    }

    return nbLines > 0 ? (int) (nbCharacters / nbLines) : 0;
  }

  public boolean isLineInHeaderComment(String line) {
    String trimmedLine = line.trim();
    if (isAtFirstLine) {
      isAtFirstLine = false;
      return isFirstLineInHeaderComment(trimmedLine);
    } else if (isInHeaderComment) {
      return isSubsequentLineInHeaderComment(trimmedLine);
    }
    return false;
  }

  private boolean isFirstLineInHeaderComment(String line) {
    if (line.startsWith("/*") && (!line.contains("*/") || line.endsWith("*/"))) {
      isClike = true;
      isInHeaderComment = !line.endsWith("*/");
      return true;
    } else if (line.startsWith("//")) {
      isClike = false;
      isInHeaderComment = true;
      return true;
    }
    return false;
  }

  private boolean isSubsequentLineInHeaderComment(String line) {
    if (isClike) {
      if (line.endsWith("*/")) {
        isInHeaderComment = false;
      } else if (line.contains("*/")) {
        // case of */ followed with something, possibly a long minified line
        isInHeaderComment = false;
        return false;
      }
      return true;
    } else {
      if (line.startsWith("//")) {
        return true;
      } else {
        isInHeaderComment = false;
        return false;
      }
    }
  }

  private static List<String> readLines(InputFile file) {
    try (
      BufferedReader reader = new BufferedReader(
        new InputStreamReader(file.inputStream(), file.charset())
      )
    ) {
      return reader.lines().collect(Collectors.toList());
    } catch (IOException e) {
      throw new IllegalStateException("Unable to read file " + file.uri(), e);
    }
  }
}
