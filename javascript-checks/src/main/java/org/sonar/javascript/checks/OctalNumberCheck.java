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

import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonarsource.analyzer.commons.annotations.DeprecatedRuleKey;

@JavaScriptRule
@Rule(key = "S1314")
@DeprecatedRuleKey(ruleKey = "OctalNumber")
public class OctalNumberCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Replace the value of the octal number (%s) by its decimal equivalent (%s).";

  @Override
  public void visitLiteral(LiteralTree tree) {
    if (tree.is(Tree.Kind.NUMERIC_LITERAL)) {
      String value = tree.value();
      if (value.length() > 1 && value.startsWith("0")) {
        int newValue;
        try {
          newValue = Integer.parseInt(value, 8);
        } catch (NumberFormatException e) {
          return;
        }
        if (newValue > 9) {
          addIssue(tree, String.format(MESSAGE, value, newValue));
        }
      }
    }
  }

}
