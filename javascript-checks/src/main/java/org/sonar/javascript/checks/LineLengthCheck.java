/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import java.util.List;
import org.sonar.check.Rule;
import org.sonar.check.RuleProperty;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.JavaScriptFile;
import org.sonar.plugins.javascript.api.visitors.LineIssue;

@JavaScriptRule
@Rule(key = "LineLength")
public class LineLengthCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Split this %s characters long line (which is greater than %s authorized).";
  private static final int DEFAULT_MAXIMUM_LINE_LENGTH = 180;

  @RuleProperty(
    key = "maximumLineLength",
    description = "The maximum authorized line length.",
    defaultValue = "" + DEFAULT_MAXIMUM_LINE_LENGTH)
  public int maximumLineLength = DEFAULT_MAXIMUM_LINE_LENGTH;

  @Override
  public void visitScript(ScriptTree tree) {
    JavaScriptFile file = getContext().getJavaScriptFile();
    List<String> lines = CheckUtils.readLines(file);

    for (int i = 0; i < lines.size(); i++) {
      int length = lines.get(i).length();

      if (length > maximumLineLength) {
        addIssue(new LineIssue(
          this,
          i + 1,
          String.format(MESSAGE, length, maximumLineLength)));
      }
    }
  }
}
