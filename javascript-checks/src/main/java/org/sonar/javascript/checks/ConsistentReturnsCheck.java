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
import java.util.HashSet;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitorCheck;

@Rule(key = "S3801")
public class ConsistentReturnsCheck extends SubscriptionVisitorCheck {

  private static final String MESSAGE = "Refactor this function to use \"return\" consistently.";

  @Override
  public Set<Kind> nodesToVisit() {
    return ImmutableSet.copyOf(KindSet.FUNCTION_KINDS.getSubKinds());
  }

  @Override
  public void visitNode(Tree tree) {
    FunctionTree functionTree = (FunctionTree) tree;
    if (functionTree.body().is(Kind.BLOCK)) {

      BlockTree body = (BlockTree) functionTree.body();
      FunctionReturns functionReturns = getFunctionReturns(body);

      if (functionReturns.containsReturnWithoutValue && functionReturns.containsReturnWithValue) {
        raiseIssue(tree, functionReturns, body);
      }
    }
  }

  private void raiseIssue(Tree functionTree, FunctionReturns functionReturns, BlockTree body) {
    SyntaxToken tokenToRaiseIssue = ((JavaScriptTree) functionTree).getFirstToken();
    if (functionTree.is(Kind.ARROW_FUNCTION)) {
      tokenToRaiseIssue = ((ArrowFunctionTree) functionTree).doubleArrow();
    }

    PreciseIssue issue = addIssue(tokenToRaiseIssue, MESSAGE);
    for (ReturnStatementTree returnStatement : functionReturns.returnStatements) {
      issue.secondary(returnStatement.returnKeyword(), returnStatement.expression() == null ? "Return without value" : "Return with value");
    }

    if (functionReturns.containsImplicitReturn) {
      issue.secondary(body.closeCurlyBrace(), "Implicit return without value");
    }
  }

  private static FunctionReturns getFunctionReturns(BlockTree functionBody) {
    FunctionReturns functionReturns = new FunctionReturns();

    ControlFlowGraph cfg = ControlFlowGraph.build(functionBody);
    if (containsTry(cfg)) {
      return functionReturns;
    }

    CfgBlock endBlock = cfg.end();

    // Possible predecessors for end block:
    // * return statement -> check for expression
    // * last statement in function -> implicit return without value
    // * throw statement -> ignore in the scope of this rule
    for (CfgBlock cfgBlock : endBlock.predecessors()) {
      Tree lastElement = cfgBlock.elements().get(cfgBlock.elements().size() - 1);
      if (lastElement.is(Kind.RETURN_STATEMENT)) {
        ReturnStatementTree returnStatement = (ReturnStatementTree) lastElement;
        if (returnStatement.expression() == null) {
          functionReturns.containsReturnWithoutValue = true;
        } else {
          functionReturns.containsReturnWithValue = true;
        }

        functionReturns.returnStatements.add(returnStatement);

      } else if (!isThrowStatement(lastElement) && isReachableBlock(cfgBlock, cfg)) {
        functionReturns.containsReturnWithoutValue = true;
        functionReturns.containsImplicitReturn = true;
      }
    }

    return functionReturns;
  }

  private static boolean containsTry(ControlFlowGraph cfg) {
    for (CfgBlock cfgBlock : cfg.blocks()) {
      if (cfgBlock instanceof CfgBranchingBlock && ((CfgBranchingBlock) cfgBlock).branchingTree().is(Kind.TRY_STATEMENT)) {
        return true;
      }
    }
    return false;
  }

  private static boolean isThrowStatement(Tree lastElement) {
    return ((JavaScriptTree) lastElement).getParent().is(Kind.THROW_STATEMENT);
  }

  private static boolean isReachableBlock(CfgBlock cfgBlock, ControlFlowGraph cfg) {
    return !cfgBlock.predecessors().isEmpty() || cfgBlock.equals(cfg.start());
  }

  private static class FunctionReturns {
    boolean containsReturnWithValue = false;
    boolean containsReturnWithoutValue = false;
    boolean containsImplicitReturn = false;
    Set<ReturnStatementTree> returnStatements = new HashSet<>();
  }

}
