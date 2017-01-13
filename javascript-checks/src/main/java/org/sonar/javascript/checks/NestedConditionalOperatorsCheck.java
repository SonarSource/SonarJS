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

import java.util.List;
import org.sonar.check.Rule;
import org.sonar.javascript.tree.TreeKinds;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.Issue;
import org.sonar.plugins.javascript.api.visitors.TreeVisitorContext;

@Rule(key = "S3358")
public class NestedConditionalOperatorsCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Extract this nested ternary operation into an independent statement.";

  private int nestingLevel;

  @Override
  public List<Issue> scanFile(TreeVisitorContext context) {
    nestingLevel = 0;

    return super.scanFile(context);
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
    Tree parent = ((JavaScriptTree) conditionalExpression).getParent();
    while (!parent.is(Kind.CONDITIONAL_EXPRESSION)) {
      if (breaksRecursion(parent)) {
        return true;
      }
      parent = ((JavaScriptTree) parent).getParent();
    }
    return false;
  }

  private static boolean breaksRecursion(Tree tree) {
    return tree.is(Kind.ARRAY_LITERAL, Kind.OBJECT_LITERAL) ||
      TreeKinds.isFunction(tree);
  }

}
