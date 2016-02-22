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
package org.sonar.javascript.cfg;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ExpressionStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForOfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.LabelledStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.TryStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WithStatementTree;

/**
 * Builder of a {@link ControlFlowGraph} for a given {@link ScriptTree} or for the body of a function.
 * Implementation note: this class starts from the end and goes backward because it's easier to implement.
 */
class ControlFlowGraphBuilder {

  private final Set<MutableBlock> blocks = new HashSet<>();
  private final EndBlock end = new EndBlock();
  private MutableBlock currentBlock = createSimpleBlock(end);
  private MutableBlock start;
  private final Deque<Breakable> breakables = new ArrayDeque<>();
  private final Deque<MutableBlock> throwTargets = new ArrayDeque<>();
  private String currentLabel = null;

  public ControlFlowGraph createGraph(ScriptTree tree) {
    List<Tree> items = ImmutableList.of();
    if (tree.items() != null) {
      items = tree.items().items();
    }
    return createGraph(items);
  }

  public ControlFlowGraph createGraph(BlockTree body) {
    return createGraph(body.statements());
  }

  private ControlFlowGraph createGraph(List<? extends Tree> items) {
    throwTargets.push(end);
    build(items);
    start = currentBlock;
    removeEmptyBlocks();
    return new ControlFlowGraph(blocks, start, end);
  }

  private void removeEmptyBlocks() {
    Map<MutableBlock, MutableBlock> emptyBlockReplacements = new HashMap<>();
    for (SingleSuccessorBlock block : Iterables.filter(blocks, SingleSuccessorBlock.class)) {
      if (block.isEmpty()) {
        MutableBlock firstNonEmptySuccessor = block.skipEmptyBlocks();
        emptyBlockReplacements.put(block, firstNonEmptySuccessor);
        for (SyntaxToken jump : block.disconnectingJumps()) {
          firstNonEmptySuccessor.addDisconnectingJump(jump);
        }
      }
    }

    blocks.removeAll(emptyBlockReplacements.keySet());

    for (MutableBlock block : blocks) {
      block.replaceSuccessors(emptyBlockReplacements);
    }

    if (emptyBlockReplacements.containsKey(start)) {
      start = emptyBlockReplacements.get(start);
    }
  }

  private void build(List<? extends Tree> trees) {
    for (Tree tree : Lists.reverse(trees)) {
      build(tree);
    }
  }

  private void build(Tree tree) {
    if (tree.is(Kind.EXPRESSION_STATEMENT)) {
      currentBlock.addElement(((ExpressionStatementTree) tree).expression());
    } else if (tree.is(Kind.VARIABLE_STATEMENT)) {
      currentBlock.addElement(((VariableStatementTree) tree).declaration());
    } else if (tree.is(Kind.IF_STATEMENT)) {
      visitIfStatement((IfStatementTree) tree);
    } else if (tree.is(Kind.FOR_STATEMENT)) {
      visitForStatement((ForStatementTree) tree);
    } else if (tree.is(Kind.FOR_IN_STATEMENT)) {
      visitForInStatement((ForInStatementTree) tree);
    } else if (tree.is(Kind.FOR_OF_STATEMENT)) {
      visitForOfStatement((ForOfStatementTree) tree);
    } else if (tree.is(Kind.WHILE_STATEMENT)) {
      visitWhileStatement((WhileStatementTree) tree);
    } else if (tree.is(Kind.DO_WHILE_STATEMENT)) {
      visitDoWhileStatement((DoWhileStatementTree) tree);
    } else if (tree.is(Kind.CONTINUE_STATEMENT)) {
      visitContinueStatement((ContinueStatementTree) tree);
    } else if (tree.is(Kind.BREAK_STATEMENT)) {
      visitBreakStatement((BreakStatementTree) tree);
    } else if (tree.is(Kind.RETURN_STATEMENT)) {
      visitReturnStatement((ReturnStatementTree) tree);
    } else if (tree.is(Kind.BLOCK)) {
      visitBlock((BlockTree) tree);
    } else if (tree.is(Kind.LABELLED_STATEMENT)) {
      visitLabelledStatement((LabelledStatementTree) tree);
    } else if (tree.is(Kind.TRY_STATEMENT)) {
      visitTryStatement((TryStatementTree) tree);
    } else if (tree.is(Kind.THROW_STATEMENT)) {
      visitThrowStatement((ThrowStatementTree) tree);
    } else if (tree.is(Kind.SWITCH_STATEMENT)) {
      visitSwitchStatement((SwitchStatementTree) tree);
    } else if (tree.is(Kind.WITH_STATEMENT)) {
      WithStatementTree with = (WithStatementTree) tree;
      build(with.statement());
      currentBlock.addElement(with.expression());
    } else if (tree.is(
      Kind.FUNCTION_DECLARATION,
      Kind.GENERATOR_DECLARATION,
      Kind.CLASS_DECLARATION,
      Kind.IMPORT_DECLARATION,
      Kind.IMPORT_MODULE_DECLARATION,
      Kind.DEFAULT_EXPORT_DECLARATION,
      Kind.NAMED_EXPORT_DECLARATION,
      Kind.NAMESPACE_EXPORT_DECLARATION,
      Kind.DEBUGGER_STATEMENT)) {
      currentBlock.addElement(tree);
    } else if (tree.is(Kind.EMPTY_STATEMENT)) {
      // Nothing to do
    } else {
      throw new IllegalArgumentException("Cannot build CFG for " + tree);
    }
  }

  private void visitBlock(BlockTree block) {
    boolean hasLabel = currentLabel != null;
    if (hasLabel) {
      addBreakable(null);
      currentBlock = createSimpleBlock(currentBlock);
    }

    build(block.statements());

    if (hasLabel) {
      removeBreakable();
    }
  }

  private void addBreakable(MutableBlock continueTarget) {
    String label = null;
    if (currentLabel != null) {
      label = currentLabel;
      currentLabel = null;
    }
    breakables.addFirst(new Breakable(continueTarget, currentBlock, label));
  }

  private void removeBreakable() {
    breakables.removeFirst();
  }

  private void visitReturnStatement(ReturnStatementTree tree) {
    currentBlock.addDisconnectingJump(tree.returnKeyword());
    currentBlock = createSimpleBlock(tree, end);
  }

  private void visitContinueStatement(ContinueStatementTree tree) {
    MutableBlock target = null;
    String label = tree.label() == null ? null : tree.label().name();
    for (Breakable breakable : breakables) {
      if (breakable.continueTarget != null && (label == null || label.equals(breakable.label))) {
        target = breakable.continueTarget;
        break;
      }
    }
    Preconditions.checkState(target != null, "No continue target can be found for label " + label);
    currentBlock.addDisconnectingJump(tree.continueKeyword());
    currentBlock = createSimpleBlock(tree, target);
  }

  private void visitBreakStatement(BreakStatementTree tree) {
    MutableBlock target = null;
    String label = tree.label() == null ? null : tree.label().name();
    for (Breakable breakable : breakables) {
      if (label == null || label.equals(breakable.label)) {
        target = breakable.breakTarget;
        break;
      }
    }
    Preconditions.checkState(target != null, "No break target can be found for label " + label);
    currentBlock.addDisconnectingJump(tree.breakKeyword());
    currentBlock = createSimpleBlock(tree, target);
  }

  private void visitIfStatement(IfStatementTree tree) {
    MutableBlock successor = currentBlock;
    if (tree.elseClause() != null) {
      buildSubFlow(tree.elseClause().statement(), successor);
    }
    MutableBlock elseBlock = currentBlock;
    buildSubFlow(tree.statement(), successor);
    MutableBlock thenBlock = currentBlock;
    BranchingBlock branchingBlock = createBranchingBlock(tree.condition());
    branchingBlock.setSuccessors(thenBlock, elseBlock);
    currentBlock = branchingBlock;
  }

  private void visitForStatement(ForStatementTree tree) {
    MutableBlock forStatementSuccessor = currentBlock;

    BranchingBlock realConditionBlock;
    ForwardingBlock fakeConditionBlock;
    MutableBlock conditionBlock;

    if (tree.condition() == null) {
      realConditionBlock = null;
      fakeConditionBlock = createForwardingBlock();
      conditionBlock = fakeConditionBlock;
    } else {
      realConditionBlock = createBranchingBlock(tree.condition());
      fakeConditionBlock = null;
      conditionBlock = realConditionBlock;
    }

    MutableBlock bodySuccessor;
    if (tree.update() != null) {
      bodySuccessor = createSimpleBlock(tree.update(), conditionBlock);
    } else {
      bodySuccessor = conditionBlock;
    }

    MutableBlock loopBodyBlock = buildLoopBody(tree.statement(), bodySuccessor);

    if (realConditionBlock != null) {
      realConditionBlock.setSuccessors(loopBodyBlock, forStatementSuccessor);
    }

    if (fakeConditionBlock != null) {
      fakeConditionBlock.setSuccessor(loopBodyBlock);
    }

    if (tree.init() == null) {
      currentBlock = createSimpleBlock(conditionBlock);
      if (tree.condition() == null && loopBodyBlock.isEmpty()) {
        loopBodyBlock.addElement(tree.forKeyword());
      }
    } else {
      currentBlock = createSimpleBlock(tree.init(), conditionBlock);
    }
  }

  private void visitForInStatement(ForInStatementTree tree) {
    MutableBlock successor = currentBlock;
    BranchingBlock assignmentBlock = createBranchingBlock(tree.variableOrExpression());

    MutableBlock loopBodyBlock = buildLoopBody(tree.statement(), assignmentBlock);

    assignmentBlock.setSuccessors(loopBodyBlock, successor);
    currentBlock = createSimpleBlock(tree.expression(), assignmentBlock);
  }

  private void visitForOfStatement(ForOfStatementTree tree) {
    MutableBlock successor = currentBlock;
    BranchingBlock assignmentBlock = createBranchingBlock(tree.variableOrExpression());

    MutableBlock loopBodyBlock = buildLoopBody(tree.statement(), assignmentBlock);

    assignmentBlock.setSuccessors(loopBodyBlock, successor);
    currentBlock = createSimpleBlock(tree.expression(), assignmentBlock);
  }

  private void visitWhileStatement(WhileStatementTree tree) {
    MutableBlock successor = currentBlock;
    BranchingBlock conditionBlock = createBranchingBlock(tree.condition());

    MutableBlock loopBodyBlock = buildLoopBody(tree.statement(), conditionBlock);

    conditionBlock.setSuccessors(loopBodyBlock, successor);
    currentBlock = conditionBlock;
  }

  private void visitDoWhileStatement(DoWhileStatementTree tree) {
    MutableBlock successor = currentBlock;
    BranchingBlock conditionBlock = createBranchingBlock(tree.condition());
    MutableBlock loopBodyBlock = buildLoopBody(tree.statement(), conditionBlock);
    conditionBlock.setSuccessors(loopBodyBlock, successor);
    currentBlock = createSimpleBlock(loopBodyBlock);
  }

  private void visitLabelledStatement(LabelledStatementTree tree) {
    currentLabel = tree.label().name();
    build(tree.statement());
  }

  private void visitTryStatement(TryStatementTree tree) {
    MutableBlock catchOrFinallyBlock = null;

    if (tree.finallyBlock() != null) {
      currentBlock = createSimpleBlock(currentBlock);
      build(tree.finallyBlock());
      throwTargets.push(currentBlock);
      catchOrFinallyBlock = currentBlock;
    }

    if (tree.catchBlock() != null) {
      MutableBlock catchSuccessor = currentBlock;
      buildSubFlow(tree.catchBlock().block(), currentBlock);
      BranchingBlock catchBlock = createBranchingBlock(tree.catchBlock().parameter());
      catchBlock.setSuccessors(currentBlock, catchSuccessor);
      catchOrFinallyBlock = catchBlock;
      currentBlock = catchBlock;
    }

    if (tree.finallyBlock() != null) {
      throwTargets.pop();
    }

    throwTargets.push(currentBlock);
    currentBlock = createSimpleBlock(currentBlock);
    build(tree.block());
    throwTargets.pop();

    if (catchOrFinallyBlock != null) {
      BranchingBlock branching = createBranchingBlock(tree.tryKeyword());
      branching.setSuccessors(currentBlock, catchOrFinallyBlock);
      currentBlock = branching;
    }
  }

  private void visitThrowStatement(ThrowStatementTree tree) {
    currentBlock.addDisconnectingJump(tree.throwKeyword());
    currentBlock = createSimpleBlock(tree.expression(), throwTargets.peek());
  }

  private void visitSwitchStatement(SwitchStatementTree tree) {
    addBreakable(null);
    MutableBlock switchNextBlock = currentBlock;
    MutableBlock nextStatementBlock = currentBlock;
    ForwardingBlock defaultForwardingBlock = createForwardingBlock();
    defaultForwardingBlock.setSuccessor(currentBlock);
    MutableBlock nextCase = defaultForwardingBlock;

    for (SwitchClauseTree switchCaseClause : Lists.reverse(tree.cases())) {
      if (switchCaseClause.is(Kind.CASE_CLAUSE)) {

        currentBlock = createSimpleBlock(nextStatementBlock);
        build(switchCaseClause.statements());
        if (!switchCaseClause.statements().isEmpty()) {
          nextStatementBlock = currentBlock;
        }

        CaseClauseTree caseClause = (CaseClauseTree) switchCaseClause;
        BranchingBlock caseBlock = createBranchingBlock(caseClause.expression());
        caseBlock.setSuccessors(nextStatementBlock, nextCase);
        nextCase = caseBlock;

      } else {

        currentBlock = createSimpleBlock(switchNextBlock);
        build(switchCaseClause.statements());
        defaultForwardingBlock.setSuccessor(currentBlock);

        if (!switchCaseClause.statements().isEmpty()) {
          nextStatementBlock = currentBlock;
        }

      }
    }

    removeBreakable();
    currentBlock = createSimpleBlock(nextCase);
    currentBlock.addElement(tree.expression());
  }

  private MutableBlock buildLoopBody(StatementTree body, MutableBlock conditionBlock) {
    addBreakable(conditionBlock);
    currentLabel = null;
    buildSubFlow(body, conditionBlock);
    MutableBlock loopBodyBlock = currentBlock;
    removeBreakable();
    return loopBodyBlock;
  }

  private void buildSubFlow(StatementTree subFlowTree, MutableBlock successor) {
    currentBlock = createSimpleBlock(successor);
    build(subFlowTree);
  }
  
  private BranchingBlock createBranchingBlock(Tree element) {
    BranchingBlock block = new BranchingBlock(element);
    blocks.add(block);
    return block;
  }

  private SimpleBlock createSimpleBlock(Tree element, MutableBlock successor) {
    SimpleBlock block = createSimpleBlock(successor);
    block.addElement(element);
    return block;
  }

  private SimpleBlock createSimpleBlock(MutableBlock successor) {
    SimpleBlock block = new SimpleBlock(successor);
    blocks.add(block);
    return block;
  }

  private ForwardingBlock createForwardingBlock() {
    ForwardingBlock block = new ForwardingBlock();
    blocks.add(block);
    return block;
  }

  private static class Breakable {

    final MutableBlock continueTarget;
    final MutableBlock breakTarget;
    final String label;

    public Breakable(MutableBlock continueTarget, MutableBlock breakTarget, String label) {
      this.continueTarget = continueTarget;
      this.breakTarget = breakTarget;
      this.label = label;
    }

  }

}
