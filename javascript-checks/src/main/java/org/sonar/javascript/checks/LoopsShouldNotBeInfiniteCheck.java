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

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.PreciseIssue;

@Rule(key = "S2189")
public class LoopsShouldNotBeInfiniteCheck extends DoubleDispatchVisitorCheck {

  @Override
  public void visitForStatement(ForStatementTree tree) {
    ControlFlowGraph controlFlow = CheckUtils.buildControlFlowGraph(tree);
    if (!canBreakOutOfLoop(tree, controlFlow)) {
      JavaScriptTree condition = (JavaScriptTree) tree.condition();
      if (condition == null) {
        addIssue(new PreciseIssue(this, new IssueLocation(tree.firstSemicolon(), tree.secondSemicolon(), "Add an end condition for this loop")));
      } else {
        Map<Tree, CfgBlock> treesOfFlowGraph = treesToBlocs(controlFlow);
        if (!conditionIsUpdated(condition, (JavaScriptTree) tree, treesOfFlowGraph)) {
          incorrectLoopCondition(condition);
        }
      }
    }
    super.visitForStatement(tree);
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    visitConditionalIterationStatement(tree, (JavaScriptTree) tree.condition());
    super.visitWhileStatement(tree);
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    visitConditionalIterationStatement(tree, (JavaScriptTree) tree.condition());
    super.visitDoWhileStatement(tree);
  }

  private void visitConditionalIterationStatement(IterationStatementTree tree, JavaScriptTree condition) {
    ControlFlowGraph controlFlow = CheckUtils.buildControlFlowGraph(tree);
    Map<Tree, CfgBlock> treesOfFlowGraph = treesToBlocs(controlFlow);
    if (!canBreakOutOfLoop(tree, controlFlow) && !conditionIsUpdated(condition, (JavaScriptTree) tree, treesOfFlowGraph)) {
      incorrectLoopCondition(condition);
    }
  }

  private void incorrectLoopCondition(JavaScriptTree condition) {
    addIssue(new PreciseIssue(this, new IssueLocation(condition.getFirstToken(), condition.getLastToken(), "Correct this loop's end condition")));
  }

  private static boolean canBreakOutOfLoop(IterationStatementTree iteration, ControlFlowGraph controlFlow) {
    Loop loop = new Loop(controlFlow, iteration);
    return !loop.jumpingExits().isEmpty();
  }

  private static boolean conditionIsUpdated(JavaScriptTree condition, JavaScriptTree iteration, Map<Tree, CfgBlock> treesOfFlowGraph) {
    Set<Symbol> conditionSymbols = condition.allSymbols().collect(Collectors.toSet());
    Stream<Symbol> symbolsGettingPotentiallyWritten = iteration.allSymbolsUsages().filter(LoopsShouldNotBeInfiniteCheck::mightBeAWrite).map(Usage::symbol);
    boolean someSymbolWasTouchedOutsideFlowGraph = !symbolsTouchedOutsideFlowGraph(conditionSymbols, treesOfFlowGraph).isEmpty();
    return symbolsGettingPotentiallyWritten.anyMatch(conditionSymbols::contains) || someSymbolWasTouchedOutsideFlowGraph;
  }

  private static Set<Symbol> symbolsTouchedOutsideFlowGraph(Set<Symbol> conditionSymbols, Map<Tree, CfgBlock> treesOfFlowGraph) {
    return conditionSymbols.stream()
      .flatMap(symbol -> symbol.usages().stream())
      .filter(usage -> !treesOfFlowGraph.containsKey(usage.identifierTree()))
      .map(Usage::symbol).collect(Collectors.toSet());
  }

  private static boolean mightBeAWrite(Usage usage) {
    if (usage.isWrite()) {
      return true;
    }
    return CheckUtils.parent(usage.identifierTree()).is(Tree.Kind.DOT_MEMBER_EXPRESSION, Tree.Kind.BRACKET_MEMBER_EXPRESSION);
  }

  private static class Loop {
    private final Optional<CfgBranchingBlock> branchBlock;
    private final Set<CfgBlock> loopBlocks;

    public Loop(ControlFlowGraph controlFlow, IterationStatementTree iteration) {
      this.branchBlock = findRootBranchingBlock(controlFlow, iteration);
      Set<CfgBlock> foundLoopBlocks = findLoopBlocks((JavaScriptTree) iteration.statement(), treesToBlocs(controlFlow));
      branchBlock.ifPresent(foundLoopBlocks::add);
      this.loopBlocks = foundLoopBlocks;
    }

    private static Optional<CfgBranchingBlock> findRootBranchingBlock(ControlFlowGraph controlFlow, IterationStatementTree iteration) {
      return controlFlow.blocks().stream()
        .filter(cfgBlock -> cfgBlock instanceof CfgBranchingBlock)
        .map(cfgBlock -> (CfgBranchingBlock) cfgBlock)
        .filter(cfgBranchingBlock -> iteration.equals(cfgBranchingBlock.branchingTree()))
        .findAny();
    }

    private static Set<CfgBlock> findLoopBlocks(JavaScriptTree iterationStatement, Map<Tree, CfgBlock> treesOfFlowGraph) {
      return iterationStatement.kin().map(treesOfFlowGraph::get).filter(Objects::nonNull).collect(Collectors.toSet());
    }

    public Set<CfgBlock> jumpingExits() {
      Set<CfgBlock> exits = exits();
      branchBlock.ifPresent(exits::remove);
      return exits;
    }

    public final Set<CfgBlock> exits() {
      return loopBlocks.stream().filter(this::isAnExit).collect(Collectors.toSet());
    }

    private boolean isAnExit(CfgBlock cfgBlock) {
      return cfgBlock.successors().stream().anyMatch(successor -> !loopBlocks.contains(successor));
    }

  }

  private static Map<Tree, CfgBlock> treesToBlocs(ControlFlowGraph graph) {
    Map<Tree, CfgBlock> treesToFlowBloc = new HashMap<>();
    graph.blocks().forEach(cfgBlock -> cfgBlock.elements().forEach(element -> treesToFlowBloc.put(element, cfgBlock)));
    return treesToFlowBloc;
  }
}
