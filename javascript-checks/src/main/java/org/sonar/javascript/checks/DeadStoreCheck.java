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
import com.google.common.collect.Lists;
import com.google.common.collect.SetMultimap;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.check.Priority;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.squidbridge.annotations.ActivatedByDefault;
import org.sonar.squidbridge.annotations.SqaleConstantRemediation;

@Rule(
  key = "S1854",
  name = "Dead Stores should be removed",
  priority = Priority.MAJOR,
  tags = {Tags.BUG, Tags.CERT, Tags.CWE, Tags.UNUSED})
@ActivatedByDefault
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
    if (!functionTree.body().is(Kind.BLOCK)) {
      return;
    }

    checkCFG(ControlFlowGraph.build((BlockTree) functionTree.body()), functionTree);
  }

  // Identifying dead stores is basically "live variable analysis".
  // See https://en.wikipedia.org/wiki/Live_variable_analysis
  private void checkCFG(ControlFlowGraph cfg, FunctionTree functionTree) {
    Usages usages = new Usages(functionTree);
    Set<BlockLiveness> livenesses = new HashSet<>();
    buildUsagesAndLivenesses(cfg, usages, livenesses);

    for (BlockLiveness blockLiveness : livenesses) {
      checkBlock(blockLiveness, usages);
    }

    for (Symbol symbol : usages.neverReadSymbols()) {
      for (Usage usage : symbol.usages()) {
        if (isWrite(usage)) {
          addIssue(usage.identifierTree(), symbol);
        }
      }
    }
  }

  private void checkBlock(BlockLiveness blockLiveness, Usages usages) {
    Set<Symbol> live = blockLiveness.liveOut;

    for (Tree element : Lists.reverse(blockLiveness.block.elements())) {
      Usage usage = usages.getUsage(element);

      if (isWrite(usage)) {

        Symbol symbol = symbol(usage);
        if (!live.contains(symbol) && !usages.hasUsagesInNestedFunctions(symbol) && !usages.isNeverRead(symbol)) {
          addIssue(usage.identifierTree(), symbol);
        }
        live.remove(symbol);

      } else if (isRead(usage)) {
        live.add(symbol(usage));
      }
    }
  }

  private void addIssue(Tree element, Symbol symbol) {
    addIssue(element, String.format(MESSAGE, symbol.name()));
  }

  private void buildUsagesAndLivenesses(ControlFlowGraph cfg, Usages usages, Set<BlockLiveness> livenesses) {
    Map<CfgBlock, BlockLiveness> livenessPerBlock = new HashMap<>();
    for (CfgBlock block : cfg.blocks()) {
      BlockLiveness blockLiveness = new BlockLiveness(block, usages);
      livenessPerBlock.put(block, blockLiveness);
      livenesses.add(blockLiveness);
    }

    // To compute the set of variables which are live OUT of a block, we need to have the
    // set of variables which are live IN its successors.
    // As the CFG may contain cycles between blocks (that's the case for loops), we use a queue
    // to keep track of blocks which may need to be updated.
    // See "worklist algorithm" in http://www.cs.cornell.edu/courses/cs4120/2013fa/lectures/lec26-fa13.pdf
    Deque<CfgBlock> queue = new ArrayDeque(cfg.blocks());
    while (!queue.isEmpty()) {
      CfgBlock block = queue.pop();
      BlockLiveness blockLiveness = livenessPerBlock.get(block);
      boolean changed = blockLiveness.updateLiveInAndOut(cfg, livenessPerBlock);
      if (changed) {
        for (CfgBlock predecessor : block.predecessors()) {
          queue.push(predecessor);
        }
      }
    }
  }

  @CheckForNull
  public static Symbol symbol(Usage usage) {
    return usage.identifierTree().symbol();
  }

  private static boolean isRead(Usage usage) {
    if (usage == null) {
      return false;
    }
    return usage.kind() == Usage.Kind.READ || usage.kind() == Usage.Kind.READ_WRITE;
  }

  private static boolean isWrite(Usage usage) {
    if (usage == null) {
      return false;
    }
    return usage.kind() == Usage.Kind.WRITE || usage.kind() == Usage.Kind.DECLARATION_WRITE;
  }

  private static class BlockLiveness {
  
    private final CfgBlock block;
    private final Usages usages;
    private final Set<Symbol> liveOut = new HashSet<>();
    private Set<Symbol> liveIn = new HashSet<>();
  
    public BlockLiveness(CfgBlock block, Usages usages) {
      this.usages = usages;
      this.block = block;
  
      for (Tree element : block.elements()) {
        if (element instanceof IdentifierTree) {
          usages.add((IdentifierTree) element);
        }
        if (element.is(Kind.ASSIGNMENT)) {
          usages.addAssignment((AssignmentExpressionTree) element);
        }
      }
    }

    public boolean updateLiveInAndOut(ControlFlowGraph cfg, Map<CfgBlock, BlockLiveness> livenessPerBlock) {
      liveOut.clear();
      for (CfgBlock successor : block.successors()) {
        liveOut.addAll(livenessPerBlock.get(successor).liveIn);
      }

      Set<Symbol> oldIn = liveIn;
      liveIn = new HashSet<>(liveOut);

      for (Tree element : Lists.reverse(block.elements())) {
        Usage usage = usages.getUsage(element);
        if (isWrite(usage)) {
          liveIn.remove(symbol(usage));
        } else if (isRead(usage)) {
          liveIn.add(symbol(usage));
        }
      }

      return !oldIn.equals(liveIn);
    }
  }

  private class Usages {

    private final Scope functionScope;
    private final Set<Symbol> symbols = new HashSet<>();
    private final Map<IdentifierTree, Usage> localVariableUsages = new HashMap<>();
    private final Set<Symbol> neverReadSymbols = new HashSet<>();
    private final SetMultimap<Symbol, Usage> usagesInCFG = HashMultimap.create();
    private final Set<Tree> assignmentVariables = new HashSet<>();

    public Usages(FunctionTree function) {
      this.functionScope = getContext().getSymbolModel().getScope(function);
    }

    public Usage getUsage(Tree element) {
      if (assignmentVariables.contains(element)) {
        return null;
      }
      if (element.is(Kind.ASSIGNMENT)) {
        return localVariableUsages.get(((AssignmentExpressionTree) element).variable());
      }
      return localVariableUsages.get(element);
    }

    public boolean hasUsagesInNestedFunctions(Symbol symbol) {
      return usagesInCFG.get(symbol).size() != symbol.usages().size();
    }

    @CheckForNull
    public Usage add(IdentifierTree identifier) {
      addSymbol(identifier.symbol());
      Usage usage = localVariableUsages.get(identifier);
      if (usage != null) {
        usagesInCFG.put(identifier.symbol(), usage);
      }
      return usage;
    }

    private void addSymbol(@Nullable Symbol symbol) {
      if (symbol == null || symbols.contains(symbol)) {
        return;
      }

      symbols.add(symbol);

      if (isLocalVariable(symbol)) {
        boolean readAtLeastOnce = false;
        for (Usage usage : symbol.usages()) {
          localVariableUsages.put(usage.identifierTree(), usage);
          if (isRead(usage)) {
            readAtLeastOnce = true;
          }
        }
        if (!readAtLeastOnce) {
          neverReadSymbols.add(symbol);
        }
      }
    }

    private boolean isLocalVariable(Symbol symbol) {
      Scope scope = symbol.scope();
      while (!scope.isGlobal()) {
        if (scope.equals(functionScope)) {
          return true;
        }
        scope = scope.outer();
      }
      return false;
    }

    public Set<Symbol> neverReadSymbols() {
      return neverReadSymbols;
    }

    public boolean isNeverRead(Symbol symbol) {
      return neverReadSymbols.contains(symbol);
    }

    public void addAssignment(AssignmentExpressionTree tree) {
      assignmentVariables.add(tree.variable());
    }
  }

}
