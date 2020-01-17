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

import com.google.common.collect.ImmutableSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ConditionalTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@JavaScriptRule
@Rule(key = "BitwiseOperators")
public class BitwiseOperatorsCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Review this use of bitwise \"%s\" operator; conditional \"%<s%<s\" might have been intended.";

  private SyntaxToken lonelyBitwiseAndOr = null;
  private boolean fileContainsBitwiseOperations = false;

  @Override
  public void visitFile(Tree scriptTree) {
    lonelyBitwiseAndOr = null;
    fileContainsBitwiseOperations = false;
  }

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.<Tree.Kind>builder()
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
    if (lonelyBitwiseAndOr == null && tree.is(Kind.BITWISE_AND, Kind.BITWISE_OR) && !((BinaryExpressionTree) tree).rightOperand().is(Kind.NUMERIC_LITERAL)) {
      lonelyBitwiseAndOr = ((BinaryExpressionTree) tree).operatorToken();

    } else {
      fileContainsBitwiseOperations = true;
    }
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    if (!fileContainsBitwiseOperations && lonelyBitwiseAndOr != null && insideCondition(lonelyBitwiseAndOr)) {
      String message = String.format(MESSAGE, lonelyBitwiseAndOr.text());
      addIssue(lonelyBitwiseAndOr, message);
    }
  }

  private static boolean insideCondition(SyntaxToken token) {
    Tree treeWithCondition = CheckUtils.getFirstAncestor(token, Kind.IF_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT, Kind.FOR_STATEMENT, Kind.CONDITIONAL_EXPRESSION);

    if (treeWithCondition == null) {
      return false;
    }

    Tree condition = ((ConditionalTree) treeWithCondition).condition();
    return condition != null && condition.isAncestorOf(token);
  }
}
