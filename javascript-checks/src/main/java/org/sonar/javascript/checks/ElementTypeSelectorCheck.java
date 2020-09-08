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

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;

@JavaScriptRule
@Rule(key = "S2898")
public class ElementTypeSelectorCheck extends AbstractJQuerySelectorOptimizationCheck {

  private static final String MESSAGE = "Use the \"[type='%s']\" selector here instead of \":%s\".";
  private static final Pattern elementUsedWithClassSelectorPattern = Pattern.compile(":(radio|checkbox|file|image|password|reset|text)", Pattern.CASE_INSENSITIVE);

  @Override
  protected void visitSelector(String selector, CallExpressionTree tree) {
    Matcher matcher = elementUsedWithClassSelectorPattern.matcher(selector);
    if (matcher.find()) {
      addIssue(tree, String.format(MESSAGE, matcher.group(1), matcher.group(1)));
    }
  }
}
