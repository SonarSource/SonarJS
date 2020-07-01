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
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.statement.ConditionalTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

public abstract class AbstractAlwaysTrueOrFalseConditionCheck extends SeCheck {

  private Set<LiteralTree> ignoredLoopConditions;

  @Override
  public void startOfExecution(Scope functionScope) {
    ignoredLoopConditions = new HashSet<>();
    Tree tree = functionScope.tree();
    new LoopsVisitor().scanTree(tree);
  }

  @Override
  public void checkConditions(Map<Tree, Collection<Constraint>> conditions) {
    for (Entry<Tree, Collection<Constraint>> entry : conditions.entrySet()) {
      Tree conditionTree = entry.getKey();

      if (ignoredLoopConditions.contains(conditionTree)) {
        continue;
      }

      Collection<Constraint> results = entry.getValue();

      if (results.size() == 1) {
        Constraint constraint = results.iterator().next();
        boolean isTruthy = Constraint.TRUTHY.equals(constraint);

        Set<Tree> neverExecutedCode = getNeverExecutedCode(conditionTree, isTruthy);

        if (neverExecutedCode.isEmpty()) {
          redundantCondition(conditionTree, isTruthy);
        } else {
          conditionWithDeadCode(conditionTree, isTruthy, neverExecutedCode);
        }
      }
    }
  }

  private static Set<Tree> getNeverExecutedCode(Tree condition, boolean isTruthy) {
    Set<Tree> neverExecutedCode = new HashSet<>();
    Tree biggestTreeWithSameTruthiness = biggestTreeWithSameTruthiness(condition, isTruthy, neverExecutedCode);
    Tree parent = CheckUtils.parentIgnoreParentheses(biggestTreeWithSameTruthiness);

    if (parent.is(Kind.IF_STATEMENT)) {
      IfStatementTree ifStatementTree = (IfStatementTree) parent;
      if (isTruthy) {
        if (ifStatementTree.elseClause() != null) {
          neverExecutedCode.add(ifStatementTree.elseClause());
        }
      } else {
        neverExecutedCode.add(ifStatementTree.statement());
      }

    } else if (parent.is(KindSet.LOOP_KINDS) && !isTruthy) {
      neverExecutedCode.add(((IterationStatementTree) parent).statement());

    } else if (parent.is(Kind.CONDITIONAL_EXPRESSION)) {
      ConditionalExpressionTree conditionalExpressionTree = (ConditionalExpressionTree) parent;
      neverExecutedCode.add(isTruthy ? conditionalExpressionTree.falseExpression() : conditionalExpressionTree.trueExpression());
    }

    return neverExecutedCode;
  }

  private static Tree biggestTreeWithSameTruthiness(Tree condition, boolean isTruthy, Set<Tree> neverExecutedCode) {
    Tree parent = CheckUtils.parentIgnoreParentheses(condition);
    if ((parent.is(Kind.CONDITIONAL_OR) && isTruthy) || (parent.is(Kind.CONDITIONAL_AND) && !isTruthy)) {
      BinaryExpressionTree binaryExpressionTree = (BinaryExpressionTree) parent;
      if (binaryExpressionTree.leftOperand().equals(condition)) {
        neverExecutedCode.add(binaryExpressionTree.rightOperand());
      }
      return biggestTreeWithSameTruthiness(parent, isTruthy, neverExecutedCode);
    }

    return condition;
  }

  /**
   * Implement this to react (raise an issue, update a metric...) to dead code
   *
   * @param condition
   * @param isTruthy
   * @param deadCode
   */
  protected void conditionWithDeadCode(Tree condition, boolean isTruthy, Set<Tree> deadCode) {

  }

  /**
   * Implement this to react (raise an issue, update a metric...) to gratuitous boolean conditions
   *
   * @param condition
   * @param isTruthy
   */
  protected void redundantCondition(Tree condition, boolean isTruthy) {

  }

  private class LoopsVisitor extends SubscriptionVisitor {

    @Override
    public Set<Kind> nodesToVisit() {
      return ImmutableSet.of(Kind.FOR_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT);
    }

    @Override
    public void visitNode(Tree tree) {
      ExpressionTree condition = ((ConditionalTree) tree).condition();
      if (condition != null && condition.is(Kind.BOOLEAN_LITERAL, Kind.NUMERIC_LITERAL)) {
        ignoredLoopConditions.add((LiteralTree) condition);
      }
    }
  }

}
