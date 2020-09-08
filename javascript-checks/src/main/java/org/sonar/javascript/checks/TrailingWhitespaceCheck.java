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

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.lexer.JavaScriptLexer;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.visitors.JavaScriptFile;
import org.sonar.plugins.javascript.api.visitors.LineIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@Rule(key = "S1131")
@DeprecatedRuleKey(ruleKey = "TrailingWhitespace")
public class TrailingWhitespaceCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove the useless trailing whitespaces at the end of this line.";

  @Override
  public Set<Tree.Kind> nodesToVisit() {
    return Collections.emptySet();
  }

  @Override
  public void visitFile(Tree scriptTree) {
    JavaScriptFile javaScriptFile = getContext().getJavaScriptFile();
    List<String> lines = CheckUtils.readLines(javaScriptFile);

    for (int i = 0; i < lines.size(); i++) {
      String line = lines.get(i);

      if (line.length() > 0 && Pattern.matches("[" + JavaScriptLexer.WHITESPACE + "]", line.subSequence(line.length() - 1, line.length()))) {
        addIssue(new LineIssue(this, i + 1, MESSAGE));
      }
    }

  }

}
