/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import org.apache.commons.lang.StringUtils;
import org.sonar.plugins.javascript.api.JavaScriptCheck;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxTrivia;
import org.sonar.plugins.javascript.api.visitors.LineIssue;

public class CommentContainsPatternChecker {
  private final JavaScriptCheck check;
  private final String pattern;
  private final String message;

  public CommentContainsPatternChecker(JavaScriptCheck check, String pattern, String message) {
    this.check = check;
    this.pattern = pattern;
    this.message = message;
  }

  public void visitToken(SyntaxToken token) {
    for (SyntaxTrivia trivia : token.trivias()) {
      String comment = trivia.text();
      if (StringUtils.containsIgnoreCase(comment, pattern)) {
        String[] lines = comment.split("\r\n?|\n");

        for (int i = 0; i < lines.length; i++) {
          if (StringUtils.containsIgnoreCase(lines[i], pattern) && !isLetterAround(lines[i], pattern)) {
            check.addIssue(new LineIssue(check, trivia.line() + i, message));
          }
        }
      }
    }
  }

  private static boolean isLetterAround(String line, String pattern) {
    int start = StringUtils.indexOfIgnoreCase(line, pattern);
    int end = start + pattern.length();

    boolean pre = start > 0 ? Character.isLetter(line.charAt(start - 1)) : false;
    boolean post = end < line.length() - 1 ? Character.isLetter(line.charAt(end)) : false;

    return pre || post;
  }

}
