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

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import com.google.common.collect.SetMultimap;
import com.google.common.collect.Sets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import org.sonar.api.server.rule.RulesDefinition;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.ControlFlowBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.cfg.ControlFlowNode;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;
import org.sonar.squidbridge.annotations.SqaleSubCharacteristic;

@Rule(
  key = "S1854",
  name = "Dead Stores should be removed",
  priority = Priority.MAJOR,
  tags = {Tags.BUG, Tags.CERT, Tags.CWE, Tags.UNUSED})
@ActivatedByDefault
@SqaleSubCharacteristic(RulesDefinition.SubCharacteristics.DATA_RELIABILITY)
@SqaleConstantRemediation("15min")
public class DeadStoreCheck extends DoubleDispatchVisitorCheck {

  private static final String MESSAGE = "Remove this useless assignment to local variable \"%s\"";

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    checkFunction(tree);
    super.visitFunctionDeclaration(tree);
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    checkFunction(tree);
    super.visitFunctionExpression(tree);
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    checkFunction(tree);
    super.visitMethodDeclaration(tree);
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    checkFunction(tree);
    super.visitArrowFunction(tree);
  }

  private void checkFunction(FunctionTree functionTree) {
    if (functionTree.body().is(Kind.BLOCK)) {
      checkCFG(ControlFlowGraph.build((BlockTree) functionTree.body()), functionTree);
    }
  }

  private void checkCFG(ControlFlowGraph cfg, FunctionTree function) {
    UsageVisitor usages = new UsageVisitor(localVariableUsages(function));
    Map<ControlFlowNode, BlockLiveness> livenessPerNode = livenessPerNode(cfg, usages);
    for (BlockLiveness blockLiveness : livenessPerNode.values()) {
      checkBlock(blockLiveness, usages);
    }
  }

  private void checkBlock(BlockLiveness blockLiveness, UsageVisitor usages) {
    Set<Symbol> live = blockLiveness.liveOut;
    for (Tree element : Lists.reverse(blockLiveness.block.elements())) {
      Set<Symbol> writes = blockLiveness.writesByElement.get(element);
      Set<Symbol> reads = blockLiveness.readsByElement.get(element);
      for (Symbol symbol : Sets.difference(writes, live)) {
        if (!usages.usedInNestedFunction.contains(symbol) || isNeverRead(symbol)) {
          addIssue(element, symbol, usages);
        }
      }
      live.removeAll(writes);
      live.addAll(reads);
    }
  }

  private boolean isNeverRead(Symbol symbol) {
    for (Usage usage : symbol.usages()) {
      if (isRead(usage.kind())) {
        return false;
      }
    }
    return true;
  }

  private void addIssue(Tree element, Symbol symbol, UsageVisitor usages) {
    for (Usage usage : usages.findUsages(element).get(symbol)) {
      if (isWrite(usage.kind())) {
        newIssue(usage.identifierTree(), String.format(MESSAGE, symbol.name()));
        break;
      }
    }
  }

  private Map<IdentifierTree, Usage> localVariableUsages(FunctionTree function) {
    Map<IdentifierTree, Usage> map = new HashMap<>();
    Scope scope = getContext().getSymbolModel().getScope(function);
    // TODO other kinds of symbols?
    for (Symbol symbol : scope.getSymbols(Symbol.Kind.VARIABLE)) {
      for (Usage usage : symbol.usages()) {
        map.put(usage.identifierTree(), usage);
      }
    }
    return map;
  }

  private Map<ControlFlowNode, BlockLiveness> livenessPerNode(ControlFlowGraph cfg, UsageVisitor usages) {
    Map<ControlFlowNode, BlockLiveness> livenessPerBlock = new HashMap<>();
    for (ControlFlowBlock block : cfg.blocks()) {
      livenessPerBlock.put(block, new BlockLiveness(block, usages, livenessPerBlock));
    }
    Deque<ControlFlowNode> queue = new ArrayDeque<ControlFlowNode>(cfg.blocks());
    while (!queue.isEmpty()) {
      ControlFlowNode block = queue.pop();
      BlockLiveness blockLiveness = livenessPerBlock.get(block);
      boolean changed = blockLiveness.update();
      if (changed) {
        for (ControlFlowNode predecessor : block.predecessors()) {
          queue.push(predecessor);
        }
      }
    }
    return livenessPerBlock;
  }


  private static boolean isRead(Usage.Kind kind) {
    return kind == Usage.Kind.READ || kind == Usage.Kind.READ_WRITE;
  }

  private static boolean isWrite(Usage.Kind kind) {
    return kind == Usage.Kind.WRITE || kind == Usage.Kind.DECLARATION_WRITE;
  }

  private static class BlockLiveness {
  
    private final ControlFlowBlock block;
    private final Map<ControlFlowNode, BlockLiveness> livenessPerBlock;
    private final SetMultimap<Tree, Symbol> readsByElement = HashMultimap.create();
    private final SetMultimap<Tree, Symbol> writesByElement = HashMultimap.create();
    private final Set<Symbol> liveOut = new HashSet<>();
    private Set<Symbol> liveIn = new HashSet<>();
  
    public BlockLiveness(
      ControlFlowBlock block, UsageVisitor usages, Map<ControlFlowNode, BlockLiveness> livenessPerBlock) {
  
      this.block = block;
      this.livenessPerBlock = livenessPerBlock;
  
      for (Tree element : Lists.reverse(block.elements())) {
        for (Entry<Symbol, Usage> usageEntry : usages.findUsages(element).entries()) {
          Symbol symbol = usageEntry.getKey();
          Usage usage = usageEntry.getValue();
          Usage.Kind kind = usage.kind();
          if (isRead(kind)) {
            readsByElement.put(element, symbol);
          } else if (isWrite(kind)) {
            writesByElement.put(element, symbol);
          }
        }
      }
    }
  
    public boolean update() {
      liveOut.clear();
      for (ControlFlowBlock successor : Iterables.filter(block.successors(), ControlFlowBlock.class)) {
        liveOut.addAll(livenessPerBlock.get(successor).liveIn);
      }
      Set<Symbol> oldIn = liveIn;
      liveIn = new HashSet<>(liveOut);
      for (Tree element : Lists.reverse(block.elements())) {
        liveIn.removeAll(writesByElement.get(element));
        liveIn.addAll(readsByElement.get(element));
      }
      return !oldIn.equals(liveIn);
    }
  }

  private static class UsageVisitor extends DoubleDispatchVisitorCheck {

    private final Map<IdentifierTree, Usage> localVariableUsages;
    private final Set<Symbol> usedInNestedFunction = new HashSet<>();

    private Deque<FunctionTree> functionStack = new ArrayDeque<>();
    private SetMultimap<Symbol, Usage> foundUsages = HashMultimap.create();

    public UsageVisitor(Map<IdentifierTree, Usage> localVariableUsages) {
      this.localVariableUsages = localVariableUsages;
    }

    public SetMultimap<Symbol, Usage> findUsages(Tree tree) {
      foundUsages.clear();
      scan(tree);
      return foundUsages;
    }

    @Override
    public void visitIdentifier(IdentifierTree identifier) {
      Usage usage = localVariableUsages.get(identifier);
      if (usage != null) {
        foundUsages.put(identifier.symbol(), usage);
        if (!functionStack.isEmpty()) {
          usedInNestedFunction.add(identifier.symbol());
        }
      }
      super.visitIdentifier(identifier);
    }

    @Override
    public void visitMethodDeclaration(MethodDeclarationTree tree) {
      functionStack.push(tree);
      super.visitMethodDeclaration(tree);
      functionStack.pop();
    }

    @Override
    public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
      functionStack.push(tree);
      super.visitFunctionDeclaration(tree);
      functionStack.pop();
    }

    @Override
    public void visitArrowFunction(ArrowFunctionTree tree) {
      functionStack.push(tree);
      super.visitArrowFunction(tree);
      functionStack.pop();
    }

    @Override
    public void visitFunctionExpression(FunctionExpressionTree tree) {
      functionStack.push(tree);
      super.visitFunctionExpression(tree);
      functionStack.pop();
    }

  }

}
