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
import com.google.common.collect.Iterables;
import java.util.List;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

import static org.sonar.javascript.checks.utils.CheckUtils.parent;

@Rule(key = "S1751")
public class UnconditionalJumpStatementCheck extends SubscriptionVisitorCheck {

  private static final Kind[] LOOP_KINDS = {
    Kind.WHILE_STATEMENT,
    Kind.DO_WHILE_STATEMENT,
    Kind.FOR_STATEMENT,
    Kind.FOR_OF_STATEMENT
  };

  @Override
  public List<Kind> nodesToVisit() {
    return ImmutableList.of(
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
    if (parent.is(LOOP_KINDS) && (tree.is(Kind.CONTINUE_STATEMENT) || !canExecuteMoreThanOnce((IterationStatementTree) parent))) {
      SyntaxToken keyword = ((JavaScriptTree) tree).getFirstToken();
      addIssue(keyword, String.format("Remove this \"%s\" statement or make it conditional", keyword.text()));
    }

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

  private static boolean hasPredecessorInsideLoopBody(CfgBranchingBlock block, IterationStatementTree loopTree) {
    for (CfgBlock loopPredecessor : block.predecessors()) {
      StatementTree loopBody = loopTree.statement();
      List<Tree> predecessorElements = loopPredecessor.elements();
      Tree lastElement = predecessorElements.get(predecessorElements.size() - 1);
      if (isDescendant(lastElement, loopBody)) {
        return true;
      }
    }
    return false;
  }

  private static boolean isDescendant(Tree tree, Tree potentialParent) {
    Tree parent = tree;
    while (parent != null) {
      if (parent.equals(potentialParent)) {
        return true;
      }
      parent = parent(parent);
    }
    return false;
  }

}
