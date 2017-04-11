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

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Iterables;
import java.util.List;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

import static org.sonar.javascript.checks.utils.CheckUtils.isDescendant;
import static org.sonar.javascript.checks.utils.CheckUtils.parent;
import static org.sonar.javascript.tree.KindSet.LOOP_KINDS;

@Rule(key = "S1751")
public class UnconditionalJumpStatementCheck extends SubscriptionVisitorCheck {

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.of(
      Kind.BREAK_STATEMENT,
      Kind.CONTINUE_STATEMENT,
      Kind.RETURN_STATEMENT,
      Kind.THROW_STATEMENT);
  }

  @Override
  public void visitNode(Tree tree) {
    Tree parent = parent(tree);
    while (parent.is(Kind.BLOCK)) {
      parent =  parent(parent);
    }

    if (!parent.is(LOOP_KINDS)) {
      return;
    }

    IterationStatementTree loopTree = (IterationStatementTree) parent;
    if (tree.is(Kind.CONTINUE_STATEMENT) || (!parent.is(Kind.FOR_IN_STATEMENT) && !isInfiniteFor(loopTree) && !canExecuteMoreThanOnce(loopTree))) {
      SyntaxToken keyword = ((JavaScriptTree) tree).getFirstToken();
      addIssue(keyword, String.format("Remove this \"%s\" statement or make it conditional", keyword.text()));
    }
  }

  private boolean isInfiniteFor(IterationStatementTree loopTree) {
    if (loopTree.is(Kind.FOR_STATEMENT)) {
      ForStatementTree forLoop = (ForStatementTree) loopTree;
      return forLoop.update() == null && forLoop.init() == null && forLoop.condition() == null;
    }

    return false;
  }

  private static boolean canExecuteMoreThanOnce(IterationStatementTree loopTree) {
    ControlFlowGraph cfg = CheckUtils.buildControlFlowGraph(loopTree);
    for (CfgBranchingBlock block : Iterables.filter(cfg.blocks(), CfgBranchingBlock.class)) {
      if (loopTree.equals(block.branchingTree()) && hasPredecessorInsideLoopBody(block, loopTree)) {
        return true;
      }
    }
    return false;
  }

  private static boolean hasPredecessorInsideLoopBody(CfgBranchingBlock conditionBlock, IterationStatementTree loopTree) {
    for (CfgBlock loopPredecessor : conditionBlock.predecessors()) {
      List<Tree> predecessorElements = loopPredecessor.elements();
      Tree predecessorLastElement = predecessorElements.get(predecessorElements.size() - 1);

      if (loopTree.is(Kind.FOR_STATEMENT)) {
        ForStatementTree forTree = (ForStatementTree) loopTree;
        if (forTree.update() != null && forTree.update().equals(predecessorLastElement)) {
          return !loopPredecessor.predecessors().isEmpty();
        }
      }

      StatementTree loopBody = loopTree.statement();
      if (isDescendant(predecessorLastElement, loopBody)) {
        return true;
      }
    }
    return false;
  }

}
