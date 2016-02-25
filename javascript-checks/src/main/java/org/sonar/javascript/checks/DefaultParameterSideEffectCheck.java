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

import org.sonar.api.server.rule.RulesDefinition.SubCharacteristics;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S3509",
  name = "Default parameters should not cause side effects",
  priority = Priority.MAJOR,
  tags = {Tags.PITFALL, Tags.ES2015})
@ActivatedByDefault
@SqaleSubCharacteristic(SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("15min")
public class DefaultParameterSideEffectCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove the side effects from this default assignment of \"%s\".";
  private InitializedBindingElementTree currentParameterWithDefault = null;

  private static final Kind[] SIDE_EFFECT_KINDS = {
    Kind.PREFIX_DECREMENT,
    Kind.POSTFIX_DECREMENT,
    Kind.PREFIX_INCREMENT,
    Kind.POSTFIX_INCREMENT
  };

  @Override
  public void visitParameterList(ParameterListTree tree) {
    if (tree.is(Kind.FORMAL_PARAMETER_LIST)) {

      for (Tree parameter : tree.parameters()) {

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
    if (tree.is(SIDE_EFFECT_KINDS) && currentParameterWithDefault != null) {
      addIssue(currentParameterWithDefault, String.format(MESSAGE, CheckUtils.asString(currentParameterWithDefault.left())));
      currentParameterWithDefault = null;
    }

    super.visitUnaryExpression(tree);
  }
}
