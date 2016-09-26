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

import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.TreeKinds;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "S3509")
public class DefaultParameterSideEffectCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove the side effects from this default assignment of \"%s\".";
  private InitializedBindingElementTree currentParameterWithDefault = null;

  @Override
  public void visitParameterList(ParameterListTree tree) {
    if (tree.is(Kind.FORMAL_PARAMETER_LIST)) {

      for (Tree parameter : tree.parameters().elements()) {

        if (parameter.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
          currentParameterWithDefault = (InitializedBindingElementTree) parameter;
          scan(parameter);
          currentParameterWithDefault = null;
        }
      }

    } else {
      super.visitParameterList(tree);
    }
  }

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (TreeKinds.isIncrementOrDecrement(tree) && currentParameterWithDefault != null) {
      addIssue(currentParameterWithDefault, String.format(MESSAGE, CheckUtils.asString(currentParameterWithDefault.left())));
      currentParameterWithDefault = null;
    }

    super.visitUnaryExpression(tree);
  }
}
