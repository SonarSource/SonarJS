/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import com.google.common.io.CharStreams;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

import org.sonar.check.Rule;
import org.sonar.javascript.compat.InputFileWrapper;
import org.sonar.javascript.lexer.JavaScriptLexer;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

import static org.sonar.javascript.compat.CompatibilityHelper.charset;

@Rule(key = "TrailingWhitespace")
public class TrailingWhitespaceCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove the useless trailing whitespaces at the end of this line.";

  @Override
  public List<Tree.Kind> nodesToVisit() {
    return Collections.emptyList();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    InputFileWrapper inputFile = getContext().getFile();
    List<String> lines;
    try (InputStreamReader inr = new InputStreamReader(inputFile.inputStream(), charset(inputFile))) {
      lines = CharStreams.readLines(inr);
    } catch (IOException e) {
      throw new IllegalStateException("Unable to execute rule \"TrailingWhitespace\" for file " + getContext().getFileName(), e);
    }

    for (int i = 0; i < lines.size(); i++) {
      String line = lines.get(i);

      if (line.length() > 0 && Pattern.matches("[" + JavaScriptLexer.WHITESPACE + "]", line.subSequence(line.length() - 1, line.length()))) {
        addIssue(new LineIssue(this, i + 1, MESSAGE));
      }
    }

  }

}
