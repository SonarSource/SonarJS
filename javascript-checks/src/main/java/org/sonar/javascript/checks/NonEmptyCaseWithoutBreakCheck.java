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

import com.google.common.collect.Iterables;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.ControlFlowBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.cfg.ControlFlowNode;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "NonEmptyCaseWithoutBreak",
  name = "Switch cases should end with an unconditional \"break\" statement",
  priority = Priority.CRITICAL,
  tags = {Tags.CERT, Tags.CWE, Tags.MISRA, Tags.PITFALL})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.LOGIC_RELIABILITY)
@SqaleConstantRemediation("10min")
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

    Map<Tree, ControlFlowBlock> caseClauseBlocksByTree = caseClauseBlocksByTree(tree);
    SwitchClauseTree previousClauseWithStatement = null;

    for (SwitchClauseTree switchClause : tree.cases()) {

      if (previousClauseWithStatement != null) {

        ControlFlowNode caseBlock;
        if (switchClause.is(Kind.CASE_CLAUSE)) {
          caseBlock = caseClauseBlocksByTree.get(switchClause).trueSuccessor();
        } else {
          caseBlock = caseClauseBlocksByTree.get(lastCaseClause).falseSuccessor();
        }

        if (canBeFallenInto(switchClause, caseBlock, caseExpressions) || hasOnlyEmptyStatements(previousClauseWithStatement)) {
          addIssue(previousClauseWithStatement.keyword(), MESSAGE);
        }
      }

      if (!switchClause.statements().isEmpty()) {
        previousClauseWithStatement = switchClause;
      }

    }
    super.visitSwitchStatement(tree);
  }

  private Map<Tree, ControlFlowBlock> caseClauseBlocksByTree(SwitchStatementTree switchTree) {
    ControlFlowGraph cfg = getControlFlowGraph(switchTree);
    Map<Tree, ControlFlowBlock> map = new HashMap<>();
    for (ControlFlowBlock block : cfg.blocks()) {
      Tree branchingTree = block.branchingTree();
      if (branchingTree != null && branchingTree.is(Kind.CASE_CLAUSE)) {
        map.put(branchingTree, block);
      }
    }
    return map;
  }

  private static void addCaseExpression(Set<Tree> caseExpressions, ExpressionTree expression) {
    caseExpressions.add(expression);
    if (expression.is(Kind.CONDITIONAL_OR)) {
      BinaryExpressionTree binary = (BinaryExpressionTree) expression;
      // The left operand of a "||" is a valid predecessor for switch clause statements
      addCaseExpression(caseExpressions, binary.leftOperand());
    }
  }

  private static boolean hasOnlyEmptyStatements(SwitchClauseTree switchClause) {
    return firstNonEmptyStatement(switchClause.statements()) == null;
  }

  private static boolean canBeFallenInto(SwitchClauseTree switchClause, ControlFlowNode caseBlock, Set<Tree> caseExpressions) {
    StatementTree firstNonEmptyStatement = firstNonEmptyStatement(switchClause.statements());
    if (firstNonEmptyStatement == null) {
      return false;
    }

    for (ControlFlowBlock predecessor : Iterables.filter(caseBlock.predecessors(), ControlFlowBlock.class)) {
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
    JavaScriptTree jsTree = (JavaScriptTree) tree;
    InternalSyntaxToken firstToken = (InternalSyntaxToken) jsTree.getFirstToken();
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

  private ControlFlowGraph getControlFlowGraph(SwitchStatementTree tree) {
    Scope scope = getContext().getSymbolModel().getScope(tree);
    while (scope.isBlock()) {
      scope = scope.outer();
    }
    if (scope.isGlobal()) {
      return ControlFlowGraph.build(getContext().getTopTree());
    } else {
      return ControlFlowGraph.build((BlockTree) ((FunctionTree) scope.tree()).body());
    }
  }

}
