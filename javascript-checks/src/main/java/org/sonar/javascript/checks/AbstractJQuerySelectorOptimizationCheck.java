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

import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.javascript.tree.symbols.type.ObjectType;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.CallExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

public abstract class AbstractJQuerySelectorOptimizationCheck extends DoubleDispatchVisitorCheck {

  protected abstract void visitSelector(String selector, CallExpressionTree tree);

  @Override
  public void visitCallExpression(CallExpressionTree tree) {
    if (tree.types().contains(ObjectType.FrameworkType.JQUERY_SELECTOR_OBJECT)) {
      SeparatedList<ExpressionTree> parameters = tree.argumentClause().arguments();

      if (!parameters.isEmpty() && parameters.get(0).is(Tree.Kind.STRING_LITERAL)) {
        String value = ((LiteralTree) parameters.get(0)).value();
        value = value.substring(1, value.length() - 1).trim();

        visitSelector(value, tree);
      }
    }
    super.visitCallExpression(tree);
  }

}
