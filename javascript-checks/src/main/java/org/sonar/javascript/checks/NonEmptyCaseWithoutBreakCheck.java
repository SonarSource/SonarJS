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

import com.google.common.collect.Iterables;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;

@JavaScriptRule
@Rule(key = "NonEmptyCaseWithoutBreak")
public class NonEmptyCaseWithoutBreakCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "End this switch case with an unconditional break, continue, return or throw statement.";

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {

    Set<Tree> caseExpressions = new HashSet<>();
    CaseClauseTree lastCaseClause = null;

    for (CaseClauseTree caseClause : Iterables.filter(tree.cases(), CaseClauseTree.class)) {
      addCaseExpression(caseExpressions, caseClause.expression());
      lastCaseClause = caseClause;
    }

    Map<CaseClauseTree, CfgBranchingBlock> caseClauseBlocksByTree = caseClauseBlocksByTree(tree);
    SwitchClauseTree previousClauseWithStatement = null;

    for (SwitchClauseTree switchClause : tree.cases()) {

      if (previousClauseWithStatement != null) {

        CfgBlock firstBlockInClauseBody;
        if (switchClause.is(Kind.CASE_CLAUSE)) {
          firstBlockInClauseBody = caseClauseBlocksByTree.get(switchClause).trueSuccessor();
        } else {
          // consider default clause
          firstBlockInClauseBody = caseClauseBlocksByTree.get(lastCaseClause).falseSuccessor();
        }

        boolean canBeFallenInto = canBeFallenInto(switchClause, firstBlockInClauseBody, caseExpressions);
        boolean hasOnlyEmptyStatements = hasOnlyEmptyStatements(previousClauseWithStatement);

        if ((canBeFallenInto || hasOnlyEmptyStatements) && !hasCommentFallThroughIntentional(previousClauseWithStatement, tree)) {
          addIssue(previousClauseWithStatement.keyword(), MESSAGE);
        }
      }

      if (!switchClause.statements().isEmpty()) {
        previousClauseWithStatement = switchClause;
      }

    }
    super.visitSwitchStatement(tree);
  }

  private static boolean hasCommentFallThroughIntentional(SwitchClauseTree caseClause, SwitchStatementTree switchStatement) {
    List<SwitchClauseTree> cases = switchStatement.cases();
    for (int i = 0; i < cases.size() - 1; i++) {
      if (cases.get(i).equals(caseClause)) {
        return !cases.get(i + 1).firstToken().trivias().isEmpty();
      }
    }
    return false;
  }

  private static Map<CaseClauseTree, CfgBranchingBlock> caseClauseBlocksByTree(SwitchStatementTree switchTree) {
    ControlFlowGraph cfg = CheckUtils.buildControlFlowGraph(switchTree);
    Map<CaseClauseTree, CfgBranchingBlock> map = new HashMap<>();
    for (CfgBlock block : cfg.blocks()) {
      if (block instanceof CfgBranchingBlock) {
        CfgBranchingBlock branchingBlock = (CfgBranchingBlock) block;
        Tree branchingTree = branchingBlock.branchingTree();
        if (branchingTree.is(Kind.CASE_CLAUSE)) {
          map.put((CaseClauseTree) branchingTree, branchingBlock);
        }
      }
    }
    return map;
  }

  private static void addCaseExpression(Set<Tree> caseExpressions, ExpressionTree expression) {
    if (expression.is(Kind.PARENTHESISED_EXPRESSION)) {
      addCaseExpression(caseExpressions, ((ParenthesisedExpressionTree) expression).expression());
    } else {
      caseExpressions.add(expression);
    }
  }

  private static boolean hasOnlyEmptyStatements(SwitchClauseTree switchClause) {
    return firstNonEmptyStatement(switchClause.statements()) == null;
  }

  private static boolean canBeFallenInto(SwitchClauseTree switchClause, CfgBlock caseBlock, Set<Tree> caseExpressions) {
    StatementTree firstNonEmptyStatement = firstNonEmptyStatement(switchClause.statements());
    if (firstNonEmptyStatement == null) {
      return false;
    }

    for (CfgBlock predecessor : caseBlock.predecessors()) {
      List<Tree> predecessorElements = predecessor.elements();
      Tree predecessorLastElement = predecessorElements.get(predecessorElements.size() - 1);
      if (!caseExpressions.contains(predecessorLastElement)) {
        // We have to make sure that the predecessor is "before" in the source code
        // to avoid false positives on switch clause statements starting with a loop.
        int statementIndex = tokenIndex(firstNonEmptyStatement);
        int predecessorIndex = tokenIndex(predecessorElements.get(0));
        if (statementIndex > predecessorIndex) {
          return true;
        }
      }
    }
    return false;
  }

  private static int tokenIndex(Tree tree) {
    InternalSyntaxToken firstToken = (InternalSyntaxToken) tree.firstToken();
    return firstToken.startIndex();
  }

  private static StatementTree firstNonEmptyStatement(List<StatementTree> statements) {
    for (StatementTree statement : statements) {
      if (statement.is(Kind.BLOCK)) {
        StatementTree nestedFirstStatement = firstNonEmptyStatement(((BlockTree) statement).statements());
        if (nestedFirstStatement != null) {
          return nestedFirstStatement;
        }
      } else if (!statement.is(Kind.EMPTY_STATEMENT)) {
        return statement;
      }
    }
    return null;
  }

}
