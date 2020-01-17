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
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S2138")
public class UndefinedAssignmentCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Use null instead.";

  @Override
  public void visitInitializedBindingElement(InitializedBindingElementTree tree) {
    if (isUndefined(tree.right())) {
      addIssue(tree.right(), MESSAGE);
    }

    super.visitInitializedBindingElement(tree);
  }

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    if (tree.is(Kind.ASSIGNMENT) && isUndefined(tree.expression())) {
      addIssue(tree.expression(), MESSAGE);
    }

    super.visitAssignmentExpression(tree);
  }

  private static boolean isUndefined(ExpressionTree expression) {
    return expression.is(Kind.IDENTIFIER_REFERENCE) && "undefined".equals(((IdentifierTree) expression).name());
  }
}
