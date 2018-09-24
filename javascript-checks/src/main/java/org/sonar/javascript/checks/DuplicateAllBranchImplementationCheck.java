/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import org.sonar.javascript.tree.SyntacticEquivalence;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;

@Rule(key = "S3923")
public class DuplicateAllBranchImplementationCheck extends AbstractDuplicateBranchImplementationCheck implements EslintBasedCheck {

  private static final String MESSAGE = "Remove this conditional structure or edit its code blocks so that they're not all the same.";
  private static final String MESSAGE_CONDITIONAL_EXPRESSION = "This conditional operation returns the same value whether the condition is \"true\" or \"false\".";

  @Override
  protected void checkDuplicatedBranches(List<Tree> branches) {
    // do nothing, covered by S1871
  }

  @Override
  protected void allBranchesDuplicated(Tree tree) {
    addIssue(tree, MESSAGE);
  }

  @Override
  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    if (SyntacticEquivalence.areEquivalent(tree.trueExpression(), tree.falseExpression())) {
      addIssue(tree, MESSAGE_CONDITIONAL_EXPRESSION);
    }

    super.visitConditionalExpression(tree);
  }

  @Override
  public String eslintKey() {
    return "no-all-duplicated-branches";
  }
}
