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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.DotMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S2228")
public class ConsoleLoggingCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this logging statement.";

  private static final Set<String> LOG_METHODS = ImmutableSet.of("log", "warn", "error");

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (tree.callee().is(Kind.DOT_MEMBER_EXPRESSION)) {
      DotMemberExpressionTree callee = (DotMemberExpressionTree) tree.callee();

      if (isCalleeConsoleLogging(callee)) {
        addIssue(callee, MESSAGE);
      }
    }

    super.visitCallExpression(tree);
  }

  private static boolean isCalleeConsoleLogging(DotMemberExpressionTree callee) {
    return callee.object().is(Kind.IDENTIFIER_REFERENCE) && "console".equals(((IdentifierTree) callee.object()).name())
      && LOG_METHODS.contains(callee.property().name());
  }

}
