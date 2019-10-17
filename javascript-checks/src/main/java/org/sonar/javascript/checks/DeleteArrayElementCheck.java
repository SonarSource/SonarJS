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

import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S2870")
public class DeleteArrayElementCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this use of \"delete\".";

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (tree.is(Tree.Kind.DELETE) && isArrayElement(tree.expression())) {
      addIssue(tree.operatorToken(), MESSAGE);
    }
    super.visitUnaryExpression(tree);
  }

  private static boolean isArrayElement(ExpressionTree expression) {
    return expression.is(Tree.Kind.BRACKET_MEMBER_EXPRESSION) && ((BracketMemberExpressionTree) expression).object().types().containsOnly(Type.Kind.ARRAY);
  }

}
