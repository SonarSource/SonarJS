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

import java.util.Optional;
import org.sonar.check.Rule;
import org.sonar.javascript.se.Constraint;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;

@Rule(key = "S3915")
public class AlwaysFalseConditionCheck extends AbstractAlwaysTrueOrFalseConditionCheck {

  private static final String MESSAGE_ELSE = "Change corresponding condition which is always \"true\" so that this block will be executed.";
  private static final String MESSAGE_TERNARY = "Change corresponding condition which is always \"true\" so that this expression will be evaluated.";

  @Override
  void checkCondition(Tree conditionTree, Constraint constraint) {
    if (Constraint.FALSY.equals(constraint)) {
      addIssue(conditionTree, "Change this expression so that it does not always evaluate to \"false\".");
      return;
    }

    Optional<ElseClauseTree> neverExecutedElseClause = neverExecutedElseClause(conditionTree, constraint);
    if (neverExecutedElseClause.isPresent()) {
      addIssue(neverExecutedElseClause.get().elseKeyword(), MESSAGE_ELSE)
        .secondary(conditionTree, "Always \"true\"");
      return;
    }

    Optional<ExpressionTree> neverEvaluatedTernaryFalseResult = neverEvaluatedTernaryFalseResult(conditionTree, constraint);
    if (neverEvaluatedTernaryFalseResult.isPresent()) {
      addIssue(neverEvaluatedTernaryFalseResult.get(), MESSAGE_TERNARY)
        .secondary(conditionTree, "Always \"true\"");
    }

  }

}
