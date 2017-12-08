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

import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.Kinds;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@Rule(key = "AssignmentWithinCondition")
public class AssignmentWithinConditionCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Extract the assignment of \"%s\" from this expression.";

  private static final Kinds[] ALLOWED_PARENT_KINDS = {
    KindSet.LOOP_KINDS,
    KindSet.EQUALITY_KINDS,
    KindSet.COMPARISON_KINDS,
    Kind.EXPRESSION_STATEMENT,
    Kind.ARROW_FUNCTION
  };

  private static final Kinds[] ALLOWED_PARENT_KINDS_WITH_INITIALIZER = {
    KindSet.LOOP_KINDS,
    KindSet.EQUALITY_KINDS,
    KindSet.COMPARISON_KINDS,
    Kind.EXPRESSION_STATEMENT,
    Kind.ARROW_FUNCTION,
    Kind.INITIALIZED_BINDING_ELEMENT
  };

  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    Tree parent = tree.parent();

    if (parent.is(Kind.PARENTHESISED_EXPRESSION) && parent.parent().is(Kind.EXPRESSION_STATEMENT) && !tree.variable().is(Kind.OBJECT_ASSIGNMENT_PATTERN)) {
      addIssue(tree);

    } else {

      Tree parentIgnoreParenthesesAndComma = parentIgnoreParenthesesAndComma(tree);
      Tree parentIgnoreAssignment = parentIgnoreAssignment(tree);

      if (!parentIgnoreParenthesesAndComma.is(ALLOWED_PARENT_KINDS) && !parentIgnoreAssignment.is(ALLOWED_PARENT_KINDS_WITH_INITIALIZER)) {
        addIssue(tree);
      }

    }

    super.visitAssignmentExpression(tree);
  }

  private void addIssue(AssignmentExpressionTree tree) {
    addIssue(tree.operatorToken(), String.format(MESSAGE, CheckUtils.asString(tree.variable())));
  }

  private static Tree parentIgnoreParenthesesAndComma(Tree tree) {
    Tree parent = tree.parent();

    if (parent.is(Kind.PARENTHESISED_EXPRESSION, Kind.COMMA_OPERATOR)) {
      return parentIgnoreParenthesesAndComma(parent);
    }

    return parent;
  }

  private static Tree parentIgnoreAssignment(Tree tree) {
    Tree parent = tree.parent();

    if (parent.is(Kind.ASSIGNMENT)) {
      return parentIgnoreAssignment(parent);
    }

    return parent;
  }
}
