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

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import org.sonar.check.Rule;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.CfgBranchingBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitorCheck;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;

@Rule(key = "S2189")
public class LoopsShouldNotBeInfiniteCheck extends DoubleDispatchVisitorCheck {

  @Override
  public void visitForStatement(ForStatementTree tree) {
    visitLoop(tree, tree.condition());
    super.visitForStatement(tree);
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    visitLoop(tree, tree.condition());
    super.visitWhileStatement(tree);
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    visitLoop(tree, tree.condition());
    super.visitDoWhileStatement(tree);
  }

  private void visitLoop(IterationStatementTree tree, @Nullable Tree condition) {
    if (isInfiniteLoop(tree, (JavaScriptTree) condition)) {
      tree.accept(new LoopIssueCreator());
    }
  }

  private static boolean isInfiniteLoop(IterationStatementTree tree, @Nullable JavaScriptTree condition) {
    if (isNeverExecutedLoop(condition)) {
      return false;
    }
    ControlFlowGraph flowGraph = CheckUtils.buildControlFlowGraph(tree);
    Map<Tree, CfgBlock> treesOfFlowGraph = treesToBlocks(flowGraph);
    if (isBrokenLoop(tree, flowGraph)) {
      return false;
    }
    return condition == null || !conditionIsUpdated(condition, (JavaScriptTree) tree, treesOfFlowGraph);
  }

  private static boolean isBrokenLoop(IterationStatementTree loopTree, ControlFlowGraph flowGraph) {
    Loop loop = new Loop(flowGraph, loopTree);
    return !loop.jumpingExits().isEmpty();
  }

  private static boolean conditionIsUpdated(JavaScriptTree condition, JavaScriptTree loopTree, Map<Tree, CfgBlock> treesOfFlowGraph) {
    Set<Symbol> conditionSymbols = allSymbols(condition).collect(Collectors.toSet());

    Stream<Symbol> writtenSymbols = allSymbolsUsages(loopTree)
      .filter(LoopsShouldNotBeInfiniteCheck::isWriteUsage)
      .map(Usage::symbol);

    Set<Symbol> symbolsTouchedOutsideFlowGraph = symbolsTouchedOutsideFlowGraph(conditionSymbols, treesOfFlowGraph);
    boolean anySymbolTouchedInAnotherFunction = !symbolsTouchedOutsideFlowGraph.isEmpty();
    return writtenSymbols.anyMatch(conditionSymbols::contains) || anySymbolTouchedInAnotherFunction;
  }

  private static boolean isNeverExecutedLoop(@Nullable JavaScriptTree condition) {
    if (condition instanceof LiteralTree) {
      LiteralTree literal = (LiteralTree) condition;
      if ("false".equals(literal.value())) {
        return true;
      }
      if ("0".equals(literal.value())) {
        return true;
      }
    }
    return false;
  }

  private static Set<Symbol> symbolsTouchedOutsideFlowGraph(Set<Symbol> conditionSymbols, Map<Tree, CfgBlock> treesOfFlowGraph) {
    return conditionSymbols.stream()
      .flatMap(symbol -> symbol.usages().stream())
      .filter(usage -> !treesOfFlowGraph.containsKey(usage.identifierTree()))
      .filter(LoopsShouldNotBeInfiniteCheck::isWriteUsage)
      .map(Usage::symbol).collect(Collectors.toSet());
  }

  private static boolean isWriteUsage(Usage usage) {
    if (usage.isWrite()) {
      return true;
    }
    return CheckUtils.parent(usage.identifierTree()).is(Tree.Kind.DOT_MEMBER_EXPRESSION, Tree.Kind.BRACKET_MEMBER_EXPRESSION, Tree.Kind.CALL_EXPRESSION);
  }

  private static class Loop {
    private final Optional<CfgBranchingBlock> branchBlock;
    private final Set<CfgBlock> loopBlocks;

    Loop(ControlFlowGraph flowGraph, IterationStatementTree iteration) {
      this.branchBlock = findRootBranchingBlock(flowGraph, iteration);
      Set<CfgBlock> foundLoopBlocks = findLoopBlocks((JavaScriptTree) iteration.statement(), treesToBlocks(flowGraph));
      branchBlock.ifPresent(foundLoopBlocks::add);
      this.loopBlocks = foundLoopBlocks;
    }

    private static Optional<CfgBranchingBlock> findRootBranchingBlock(ControlFlowGraph flowGraph, IterationStatementTree iteration) {
      return flowGraph.blocks().stream()
        .filter(cfgBlock -> cfgBlock instanceof CfgBranchingBlock)
        .map(cfgBlock -> (CfgBranchingBlock) cfgBlock)
        .filter(cfgBranchingBlock -> iteration.equals(cfgBranchingBlock.branchingTree()))
        .findAny();
    }

    private static Set<CfgBlock> findLoopBlocks(JavaScriptTree iterationStatement, Map<Tree, CfgBlock> treesOfFlowGraph) {
      return iterationStatement.descendants().map(treesOfFlowGraph::get).filter(Objects::nonNull).collect(Collectors.toSet());
    }

    Set<CfgBlock> jumpingExits() {
      Set<CfgBlock> exits = exits();
      branchBlock.ifPresent(exits::remove);
      return exits;
    }

    final Set<CfgBlock> exits() {
      return loopBlocks.stream().filter(this::isExit).collect(Collectors.toSet());
    }

    private boolean isExit(CfgBlock cfgBlock) {
      return cfgBlock.successors().stream().anyMatch(successor -> !loopBlocks.contains(successor));
    }

  }

  private static Map<Tree, CfgBlock> treesToBlocks(ControlFlowGraph graph) {
    Map<Tree, CfgBlock> treesToFlowBlock = new HashMap<>();
    graph.blocks().forEach(cfgBlock -> cfgBlock.elements().forEach(element -> treesToFlowBlock.put(element, cfgBlock)));
    return treesToFlowBlock;
  }

  private static Stream<Symbol> allSymbols(JavaScriptTree root) {
    Stream<JavaScriptTree> thisAndDescendants = Stream.concat(Stream.<JavaScriptTree>builder().add(root).build(), root.descendants());
    return thisAndDescendants.filter(tree -> tree instanceof IdentifierTree)
      .map(tree -> (IdentifierTree) tree)
      .filter(identifierTree -> identifierTree.symbol() != null)
      .map(IdentifierTree::symbol);
  }

  private static Stream<Usage> allSymbolsUsages(JavaScriptTree root) {
    return allSymbols(root).flatMap(symbol -> symbol.usages().stream()).filter(usage -> root.isAncestorOf((JavaScriptTree) usage.identifierTree()));
  }

  private class LoopIssueCreator extends DoubleDispatchVisitor {
    @Override
    public void visitWhileStatement(WhileStatementTree tree) {
      createIssue(tree.whileKeyword(), tree.condition());
    }

    @Override
    public void visitDoWhileStatement(DoWhileStatementTree tree) {
      createIssue(tree.doKeyword(), tree.condition());
    }

    @Override
    public void visitForStatement(ForStatementTree tree) {
      if (tree.condition() == null) {
        addIssue(tree.forKeyword(), "Add an end condition for this loop").secondary(new IssueLocation(tree.firstSemicolon(), tree.secondSemicolon(), null));
      } else {
        createIssue(tree.forKeyword(), tree.condition());
      }
    }

    private void createIssue(Tree keyword, Tree condition) {
      LoopsShouldNotBeInfiniteCheck.this.addIssue(keyword, "Correct this loop's end condition")
        .secondary(new IssueLocation(condition, null));
    }

  }
}
