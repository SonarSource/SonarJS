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
package org.sonar.javascript.se;

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
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

/**
 * This class provides information about symbols which are "live" (which value will be read) at some point of the program.
 * See https://en.wikipedia.org/wiki/Live_variable_analysis
 */
public class LiveVariableAnalysis {

  private final Usages usages;
  private Map<CfgBlock, BlockLiveness> livenessPerBlock;
  private boolean lvaForSymbolicExecution;

  public Set<Symbol> getLiveOutSymbols(CfgBlock block) {
    BlockLiveness blockLiveness = livenessPerBlock.get(block);
    return blockLiveness.liveOut;
  }

  public Set<Symbol> getLiveInSymbols(CfgBlock block) {
    BlockLiveness blockLiveness = livenessPerBlock.get(block);
    return blockLiveness.liveIn;
  }

  private LiveVariableAnalysis(ControlFlowGraph cfg, Scope scope, boolean lvaForSymbolicExecution){
    this.usages = new Usages(scope);
    this.lvaForSymbolicExecution = lvaForSymbolicExecution;
    Set<BlockLiveness> livenesses = new HashSet<>();
    buildUsagesAndLivenesses(cfg, usages, livenesses);
  }

  public static LiveVariableAnalysis create(ControlFlowGraph cfg, Scope scope) {
    return new LiveVariableAnalysis(cfg, scope, false);
  }

  public static LiveVariableAnalysis createForSymbolicExecution(ControlFlowGraph cfg, Scope scope) {
    return new LiveVariableAnalysis(cfg, scope, true);
  }


  private void buildUsagesAndLivenesses(ControlFlowGraph cfg, Usages usages, Set<BlockLiveness> livenesses) {
    livenessPerBlock = new HashMap<>();
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
    Deque<CfgBlock> queue = new ArrayDeque<>(cfg.blocks());
    while (!queue.isEmpty()) {
      CfgBlock block = queue.pop();
      BlockLiveness blockLiveness = livenessPerBlock.get(block);
      boolean changed = blockLiveness.updateLiveInAndOut(livenessPerBlock);
      if (changed) {
        block.predecessors().forEach(queue::push);
      }
    }
  }

  public Usages getUsages() {
    return usages;
  }

  private class BlockLiveness {

    private final CfgBlock block;
    private final Usages usages;
    private final Set<Symbol> liveOut = new HashSet<>();
    private Set<Symbol> liveIn = new HashSet<>();

    private BlockLiveness(CfgBlock block, Usages usages) {
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

    private boolean updateLiveInAndOut(Map<CfgBlock, BlockLiveness> livenessPerBlock) {
      liveOut.clear();
      for (CfgBlock successor : block.successors()) {
        liveOut.addAll(livenessPerBlock.get(successor).liveIn);
      }

      Set<Symbol> oldIn = liveIn;
      liveIn = new HashSet<>(liveOut);

      for (Tree element : Lists.reverse(block.elements())) {
        Usage usage = usages.getUsage(element);
        if (LiveVariableAnalysis.this.isWrite(usage)) {
          liveIn.remove(usage.symbol());
        } else if (isRead(usage)) {
          liveIn.add(usage.symbol());
        }
      }

      return !oldIn.equals(liveIn);
    }
  }

  public class Usages {

    private final Scope functionScope;
    private final Set<Symbol> symbols = new HashSet<>();
    private final Map<IdentifierTree, Usage> localVariableUsages = new HashMap<>();
    private final Set<Symbol> neverReadSymbols = new HashSet<>();
    private final SetMultimap<Symbol, Usage> usagesInCFG = HashMultimap.create();
    private final Set<Tree> assignmentVariables = new HashSet<>();

    private Usages(Scope functionScope) {
      this.functionScope = functionScope;
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
    private Usage add(IdentifierTree identifier) {
      identifier.symbol().ifPresent(s -> addSymbol(s));
      Usage usage = localVariableUsages.get(identifier);
      if (usage != null) {
        usagesInCFG.put(usage.symbol(), usage);
      }
      return usage;
    }

    private void addSymbol(Symbol symbol) {
      if (symbols.contains(symbol)) {
        return;
      }

      symbols.add(symbol);

      if (isLocalVariable(symbol)) {
        boolean readAtLeastOnce = false;
        for (Usage usage : symbol.usages()) {
          localVariableUsages.put(usage.identifierTree(), usage);
          if (LiveVariableAnalysis.this.isRead(usage)) {
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

    private void addAssignment(AssignmentExpressionTree tree) {
      assignmentVariables.add(tree.variable());
    }
  }

  public boolean isRead(@Nullable Usage usage) {
    if (usage == null) {
      return false;
    }
    return usage.kind() == Usage.Kind.READ || usage.kind() == Usage.Kind.READ_WRITE  || (this.lvaForSymbolicExecution && usage.kind() == Usage.Kind.WRITE);
  }

  public boolean isWrite(@Nullable Usage usage) {
    if (usage == null) {
      return false;
    }
    return usage.kind() == Usage.Kind.DECLARATION_WRITE || (!this.lvaForSymbolicExecution && usage.kind() == Usage.Kind.WRITE);
  }

}
