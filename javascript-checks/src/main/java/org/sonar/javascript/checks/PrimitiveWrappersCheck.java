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

import com.google.common.collect.ImmutableMap;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ArgumentListTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.NewExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "PrimitiveWrappers")
public class PrimitiveWrappersCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Use a literal value for this.";

  private static final Map<String, Kind> ALLOWED_ARGUMENT_PER_WRAPPER = ImmutableMap.of(
    "Boolean", Kind.BOOLEAN_LITERAL,
    "Number", Kind.NUMERIC_LITERAL,
    "String", Kind.STRING_LITERAL
  );

  @Override
  public void visitNewExpression(NewExpressionTree tree) {
    ExpressionTree constructor = tree.expression();
    ArgumentListTree arguments = tree.argumentClause();

    if (constructor.is(Kind.IDENTIFIER_REFERENCE)) {
      Kind allowedArgument = ALLOWED_ARGUMENT_PER_WRAPPER.get(((IdentifierTree) constructor).name());

      if (allowedArgument != null && !isAllowedUsage(arguments, allowedArgument)) {
        addIssue(tree, MESSAGE);
      }
    }

    super.visitNewExpression(tree);
  }

  private static boolean isAllowedUsage(@Nullable ArgumentListTree arguments, Kind allowedArgument) {
    if (arguments != null && arguments.arguments().size() == 1) {
      Tree argument = arguments.arguments().get(0);
      if (argument.is(allowedArgument)) {
        return !"false".equals(((LiteralTree) argument).value());
      }
    }

    return false;
  }

}
