/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
package org.sonar.plugins.javascript.minify;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import org.sonar.squidbridge.api.AnalysisException;

/**
 * An object to assess if a .js file is a minified file or not.
 */
public class MinificationAssessor {

  private static final int DEFAULT_AVERAGE_LINE_LENGTH_THRESHOLD = 200;

  private Charset encoding;

  /**
   * Value of the average line length 
   * (= number of chars in the file / number of lines in the file)
   * below which a file is not assessed as being a minified file.   
   */
  private int averageLineLengthThreshold;

  public MinificationAssessor(Charset encoding) {
    this(encoding, DEFAULT_AVERAGE_LINE_LENGTH_THRESHOLD);
  }

  public MinificationAssessor(Charset encoding, int averageLineLengthThreshold) {
    this.encoding = encoding;
    this.averageLineLengthThreshold = averageLineLengthThreshold;
  }

  public boolean isMinified(File file) {
    return isJavaScriptFile(file) &&
      (hasMinifiedFileName(file) || hasExcessiveAverageLineLength(file));
  }

  private static boolean hasMinifiedFileName(File file) {
    String fileName = file.getName();
    return fileName.endsWith("-min.js") || fileName.endsWith(".min.js");
  }

  private static boolean isJavaScriptFile(File file) {
    return file.getName().endsWith(".js");
  }

  private boolean hasExcessiveAverageLineLength(File file) {
    long nbLines = 0;
    long nbCharacters = 0;
    LeadingCommentDetector detector = new LeadingCommentDetector();

    // get the number of characters in the file
    try (BufferedReader reader = getReader(file)) {
      nbCharacters = reader.lines()
        .filter(line -> !detector.isLineInLeadingComment(line))
        .mapToLong(line -> line.length())
        .sum();
    } catch (IOException e) {
      handleException(e, file);
    }

    // get the number of lines in the file
    try (BufferedReader reader = getReader(file)) {
      nbLines = reader.lines().count();
    } catch (IOException e) {
      handleException(e, file);
    }
    nbLines -= detector.getNumberOfLinesInLeadingComment();

    // check against the threshold
    int averageLineLength = nbLines > 0 ? (int) (nbCharacters / nbLines) : -1;
    return averageLineLength > averageLineLengthThreshold;
  }

  private BufferedReader getReader(File file) throws IOException {
    return new BufferedReader(new InputStreamReader(new FileInputStream(file), encoding));
  }

  private static void handleException(IOException e, File file) {
    throw new AnalysisException("Unable to analyse file: " + file.getAbsolutePath(), e);
  }

  /**
   * Helper class:
   * <ul>
   *   <li>to detect if a line is part of a leading comment, and</li>
   *   <li>to return the number of lines in the leading comment.</li>
   * </ul>
   * A leading comment is a comment which starts on the first line of the file.
   * It may be either a C-like comment (i.e., it starts with <code>"/*"</code>) or a C++-like comment
   * (i.e., it starts with <code>"//"</code>).
   */
  static class LeadingCommentDetector {

    private boolean isAtFirstLine = true;

    private boolean isInLeadingComment = false;

    private boolean isClike = false;

    private int numberOfLinesInLeadingComment = 0;

    public boolean isLineInLeadingComment(String line) {
      String trimmedLine = line.trim();
      if (isAtFirstLine) {
        return isFirstLineInLeadingComment(trimmedLine);
      } else if (isInLeadingComment) {
        return isSubsequentLineInLeadingComment(trimmedLine);
      }
      return false;
    }
    
    private boolean isFirstLineInLeadingComment(String line) {
      isAtFirstLine = false;
      if (line.startsWith("/*")) {
        isClike = true;
        numberOfLinesInLeadingComment++;
        isInLeadingComment = !line.endsWith("*/");
        return true;
      } else if (line.startsWith("//")) {
        isClike = false;
        numberOfLinesInLeadingComment++;
        isInLeadingComment = true;
        return true;
      }
      return false;
    }
    
    private boolean isSubsequentLineInLeadingComment(String line) {
      if (isClike) {
        if (line.endsWith("*/")) {
          numberOfLinesInLeadingComment++;
          isInLeadingComment = false;
        } else if (line.contains("*/")) {
          // case of a */ followed with something, possibly a long minified line
          isInLeadingComment = false;
          return false;
        } else {
          numberOfLinesInLeadingComment++;
        }
        return true;
      } else {
        if (line.startsWith("//")) {
          numberOfLinesInLeadingComment++;
          return true;
        } else {
          isInLeadingComment = false;
          return false;
        }
      }
    }

    public int getNumberOfLinesInLeadingComment() {
      return numberOfLinesInLeadingComment;
    }

  }

}
