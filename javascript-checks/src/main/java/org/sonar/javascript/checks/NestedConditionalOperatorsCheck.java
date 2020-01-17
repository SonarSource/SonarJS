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
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "S3358")
public class NestedConditionalOperatorsCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Extract this nested ternary operation into an independent statement.";

  private int nestingLevel;

  @Override
  public void visitScript(ScriptTree tree) {
    nestingLevel = 0;

    super.visitScript(tree);
  }

  @Override
  public void visitConditionalExpression(ConditionalExpressionTree conditionalExpression) {
    if (nestingLevel > 0 && !isNestingBroken(conditionalExpression)) {
      addIssue(conditionalExpression, MESSAGE);
    }
    nestingLevel++;

    super.visitConditionalExpression(conditionalExpression);

    nestingLevel--;
  }

  /**
   * Returns true if, between the ConditionalExpression and its nesting ConditionExpression,
   * there is a construct that functionally "disconnects" the two ConditionExpressions. 
   */
  private static boolean isNestingBroken(ConditionalExpressionTree conditionalExpression) {
    Tree parent = conditionalExpression.parent();
    while (!parent.is(Kind.CONDITIONAL_EXPRESSION)) {
      if (breaksNesting(parent)) {
        return true;
      }
      parent = parent.parent();
    }
    return false;
  }

  private static boolean breaksNesting(Tree tree) {
    return tree.is(Kind.ARRAY_LITERAL, Kind.OBJECT_LITERAL) ||
      tree.is(KindSet.FUNCTION_KINDS);
  }

}
