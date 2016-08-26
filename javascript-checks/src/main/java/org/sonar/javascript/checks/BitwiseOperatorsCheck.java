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

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "BitwiseOperators")
public class BitwiseOperatorsCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove the use of \"%s\" operator.";

  @Override
  public List<Tree.Kind> nodesToVisit() {
    return ImmutableList.<Tree.Kind>builder()
      .add(Tree.Kind.BITWISE_AND)
      .add(Tree.Kind.BITWISE_OR)
      .add(Tree.Kind.BITWISE_XOR)
      .add(Tree.Kind.BITWISE_COMPLEMENT)
      .add(Tree.Kind.LEFT_SHIFT)
      .add(Tree.Kind.RIGHT_SHIFT)
      .add(Tree.Kind.UNSIGNED_RIGHT_SHIFT)
      .add(Tree.Kind.AND_ASSIGNMENT)
      .add(Tree.Kind.OR_ASSIGNMENT)
      .add(Tree.Kind.XOR_ASSIGNMENT)
      .add(Tree.Kind.LEFT_SHIFT_ASSIGNMENT)
      .add(Tree.Kind.RIGHT_SHIFT_ASSIGNMENT)
      .add(Tree.Kind.UNSIGNED_RIGHT_SHIFT_ASSIGNMENT)
      .build();
  }

  @Override
  public void visitNode(Tree tree) {
    SyntaxToken operator;
    if (tree.is(Tree.Kind.BITWISE_COMPLEMENT)) {
      operator = ((UnaryExpressionTree) tree).operator();
    } else if (tree instanceof BinaryExpressionTree) {
      operator = ((BinaryExpressionTree) tree).operator();
    } else {
      operator = ((AssignmentExpressionTree) tree).operator();
    }
    addIssue(operator, String.format(MESSAGE, operator.text()));
  }

}
