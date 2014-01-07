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
package org.sonar.javascript.checks;

import com.sonar.sslr.api.Token;
import com.sonar.sslr.api.Trivia;
import com.sonar.sslr.squid.checks.SquidCheck;
import org.apache.commons.lang.StringUtils;

public class CommentContainsPatternChecker {
  private final SquidCheck<?> check;
  private final String pattern;
  private final String message;

  public CommentContainsPatternChecker(SquidCheck<?> check, String pattern, String message) {
    this.check = check;
    this.pattern = pattern;
    this.message = message;
  }

  public void visitToken(Token token) {
    for (Trivia trivia : token.getTrivia()) {
      String comment = trivia.getToken().getOriginalValue();
      if (StringUtils.containsIgnoreCase(comment, pattern)) {
        String[] lines = comment.split("\r\n?|\n");

        for (int i = 0; i < lines.length; i++) {
          if (StringUtils.containsIgnoreCase(lines[i], pattern) && !isLetterAround(lines[i], pattern)) {
            check.getContext().createLineViolation(check, message, trivia.getToken().getLine() + i);
          }
        }
      }
    }
  }

  private boolean isLetterAround(String line, String pattern) {
    int start = StringUtils.indexOfIgnoreCase(line, pattern);
    int end = start + pattern.length();

    boolean pre = start > 0 ? Character.isLetter(line.charAt(start - 1)) : false;
    boolean post = end < line.length() - 1 ? Character.isLetter(line.charAt(end)) : false;

    return pre || post;
  }

}
