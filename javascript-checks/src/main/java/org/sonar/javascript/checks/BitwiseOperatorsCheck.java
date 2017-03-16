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

import com.google.common.collect.ImmutableList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "BitwiseOperators")
public class BitwiseOperatorsCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Remove the use of \"%s\" operator.";

  private Set<SyntaxToken> bitwiseAndOrOperators = new HashSet<>();
  private boolean fileContainsBitwiseOperations = false;

  @Override
  public void visitFile(Tree scriptTree) {
    bitwiseAndOrOperators.clear();
    fileContainsBitwiseOperations = false;
  }

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
    if (tree.is(Kind.BITWISE_AND, Kind.BITWISE_OR) && !((BinaryExpressionTree) tree).rightOperand().is(Kind.NUMERIC_LITERAL)) {
      SyntaxToken operator = ((BinaryExpressionTree) tree).operator();
      bitwiseAndOrOperators.add(operator);

    } else {
      fileContainsBitwiseOperations = true;
    }
  }

  @Override
  public void leaveFile(Tree scriptTree) {
    if (!fileContainsBitwiseOperations && bitwiseAndOrOperators.size() == 1) {

      bitwiseAndOrOperators.stream()
        .filter(BitwiseOperatorsCheck::insideCondition)
        .forEach(syntaxToken ->
          addIssue(syntaxToken, String.format(MESSAGE, syntaxToken.text())));
    }
  }

  private static boolean insideCondition(SyntaxToken token) {
    Tree treeWithCondition = CheckUtils.getFirstAncestor(token, Kind.IF_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT, Kind.FOR_STATEMENT, Kind.CONDITIONAL_EXPRESSION);

    Tree condition = condition(treeWithCondition);
    return condition != null && ((JavaScriptTree) condition).isAncestorOf((JavaScriptTree) token);
  }

  @Nullable
  private static Tree condition(@Nullable Tree treeWithCondition) {
    Tree condition = null;

    if (treeWithCondition != null) {

      if (treeWithCondition.is(Kind.IF_STATEMENT)) {
        condition = ((IfStatementTree) treeWithCondition).condition();

      } else if (treeWithCondition.is(Kind.WHILE_STATEMENT)) {
        condition = ((WhileStatementTree) treeWithCondition).condition();

      } else if (treeWithCondition.is(Kind.DO_WHILE_STATEMENT)) {
        condition = ((DoWhileStatementTree) treeWithCondition).condition();

      } else if (treeWithCondition.is(Kind.FOR_STATEMENT)) {
        condition = ((ForStatementTree) treeWithCondition).condition();

      } else {
        condition = ((ConditionalExpressionTree) treeWithCondition).condition();
      }
    }

    return condition;
  }
}
