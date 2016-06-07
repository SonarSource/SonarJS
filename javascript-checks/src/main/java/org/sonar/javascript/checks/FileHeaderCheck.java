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
package org.sonar.javascript.checks;

import com.google.common.io.Files;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.tree.visitors.CharsetAwareVisitor;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.FileIssue;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S1451",
  name = "Copyright and license headers should be defined",
  priority = Priority.BLOCKER)
@SqaleConstantRemediation("5min")
public class FileHeaderCheck extends DoubleDispatchVisitorCheck implements CharsetAwareVisitor {

  private static final String MESSAGE = "Add or update the header of this file.";
  private static final String DEFAULT_HEADER_FORMAT = "";

  @RuleProperty(
    key = "headerFormat",
    description = "Expected copyright and license header",
    defaultValue = DEFAULT_HEADER_FORMAT,
    type = "TEXT")
  public String headerFormat = DEFAULT_HEADER_FORMAT;

  @RuleProperty(
    key = "isRegularExpression",
    description = "Whether the headerFormat is a regular expression",
    defaultValue = "false")
  public boolean isRegularExpression = false;

  private Charset charset;
  private String[] expectedLines = null;
  private Pattern searchPattern = null;

  @Override
  public void setCharset(Charset charset) {
    this.charset = charset;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    if (isRegularExpression) {
      checkRegularExpression();

    } else {
      checkPlainText();
    }
  }

  private void checkPlainText() {
    if (expectedLines == null) {
      expectedLines = headerFormat.split("(?:\r)?\n|\r");
    }
    List<String> lines;
    try {
      lines = Files.readLines(getContext().getFile(), charset);
    } catch (IOException e) {
      String fileName = getContext().getFile().getName();
      throw new IllegalStateException("Unable to execute rule \"S1451\" for file " + fileName, e);
    }
    if (!matches(expectedLines, lines)) {
      addIssue(new FileIssue(this, MESSAGE));
    }
  }

  private void checkRegularExpression() {
    if (searchPattern == null) {
      try {
        searchPattern = Pattern.compile(headerFormat, Pattern.DOTALL);
      } catch (IllegalArgumentException e) {
        throw new IllegalArgumentException("[" + getClass().getSimpleName() + "] Unable to compile the regular expression: " + headerFormat, e);
      }
    }
    String fileContent;
    try {
      fileContent = Files.toString(getContext().getFile(), charset);
    } catch (IOException e) {
      String fileName = getContext().getFile().getName();
      throw new IllegalStateException("Unable to execute rule \"S1451\" for file " + fileName, e);
    }

    Matcher matcher = searchPattern.matcher(fileContent);
    if (!matcher.find() || matcher.start() != 0) {
      addIssue(new FileIssue(this, MESSAGE));
    }
  }

  private static boolean matches(String[] expectedLines, List<String> lines) {
    boolean result;

    if (expectedLines.length <= lines.size()) {
      result = true;

      Iterator<String> it = lines.iterator();
      for (String expectedLine : expectedLines) {
        String line = it.next();
        if (!line.equals(expectedLine)) {
          result = false;
          break;
        }
      }
    } else {
      result = false;
    }

    return result;
  }

}
