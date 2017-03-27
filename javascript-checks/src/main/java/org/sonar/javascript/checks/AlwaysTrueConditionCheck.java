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
import org.sonar.javascript.se.Constraint;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;

@Rule(key = "S2583")
public class AlwaysTrueConditionCheck extends AbstractAlwaysTrueOrFalseConditionCheck {

  @Override
  void checkCondition(Tree conditionTree, Constraint constraint) {
    if (Constraint.TRUTHY.equals(constraint) && !isTruthyLiteral(conditionTree, constraint) && !makesSomeCodeNeverExecuted(conditionTree, constraint)) {
      addIssue(conditionTree, "Change this expression so that it does not always evaluate to \"true\".");
    }
  }

  private static boolean makesSomeCodeNeverExecuted(Tree conditionTree, Constraint constraint) {
    return neverExecutedElseClause(conditionTree, constraint).isPresent() || neverEvaluatedTernaryFalseResult(conditionTree, constraint).isPresent();
  }

  private static boolean isTruthyLiteral(Tree tree, Constraint constraint) {
    ExpressionTree conditionWithoutParentheses = CheckUtils.removeParenthesis((ExpressionTree) tree);

    return Constraint.TRUTHY.equals(constraint)
      && conditionWithoutParentheses.is(
        Kind.ARRAY_LITERAL,
        Kind.OBJECT_LITERAL,
        Kind.NEW_EXPRESSION,
        Kind.NUMERIC_LITERAL,
        Kind.STRING_LITERAL);
  }
}
