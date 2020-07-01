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
package org.sonar.javascript.checks.utils;

import java.util.HashSet;
import java.util.Set;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;

public class FunctionReturns {
  private boolean containsReturnWithValue = false;
  private boolean containsReturnWithoutValue = false;
  private boolean containsImplicitReturn = false;
  private Set<ReturnStatementTree> returnStatements = new HashSet<>();

  public static FunctionReturns getFunctionReturns(BlockTree functionBody) {
    FunctionReturns functionReturns = new FunctionReturns();

    ControlFlowGraph cfg = ControlFlowGraph.build(functionBody);
    if (containsTry(cfg)) {
      return functionReturns;
    }

    CfgBlock endBlock = cfg.end();

    // Possible predecessors for end block:
    // * return statement -> check for expression
    // * last statement in function -> implicit return without value
    // * throw statement -> we only target return here, so ignore
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
    return lastElement.parent().is(Kind.THROW_STATEMENT);
  }

  private static boolean isReachableBlock(CfgBlock cfgBlock, ControlFlowGraph cfg) {
    return !cfgBlock.predecessors().isEmpty() || cfgBlock.equals(cfg.start());
  }

  public boolean containsReturnWithValue() {
    return containsReturnWithValue;
  }

  public boolean containsReturnWithoutValue() {
    return containsReturnWithoutValue;
  }

  public boolean containsImplicitReturn() {
    return containsImplicitReturn;
  }

  public Set<ReturnStatementTree> returnStatements() {
    return returnStatements;
  }
}
