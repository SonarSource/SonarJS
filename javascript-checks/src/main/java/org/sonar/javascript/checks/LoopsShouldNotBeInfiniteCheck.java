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

import com.google.common.collect.ImmutableSet;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
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
import org.sonar.javascript.checks.annotations.JavaScriptRule;
import org.sonar.javascript.checks.utils.CheckUtils;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.SeCheck;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;
import org.sonar.plugins.javascript.api.tree.statement.ConditionalTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IterationStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

@JavaScriptRule
@Rule(key = "S2189")
public class LoopsShouldNotBeInfiniteCheck extends SeCheck {


  private FileLoops fileLoops;
  private Set<Tree> alwaysTrueConditions = new HashSet<>();

  @Override
  protected void startOfFile(ScriptTree scriptTree) {
    alwaysTrueConditions.clear();
    fileLoops = FileLoops.create(scriptTree);
  }

  @Override
  public void checkConditions(Map<Tree, Collection<Constraint>> conditions) {
    alwaysTrueConditions.addAll(conditions.entrySet().stream()
      .filter(treeCollectionEntry -> alwaysTrue(treeCollectionEntry.getValue()))
      .map(Map.Entry::getKey)
      .collect(Collectors.toSet()));
  }

  @Override
  public void endOfFile(ScriptTree scriptTree) {
    fileLoops.loopsAndConditions.entrySet().stream()
      .filter(entry -> isInfiniteLoop(entry.getKey(), (JavaScriptTree) entry.getValue()))
      .forEach(entry -> addIssue(entry.getKey()));
  }

  private void addIssue(IterationStatementTree loop) {
    loop.accept(new LoopIssueCreator());
  }

  /**
   * FileLoops is a tree visitor that collects a map of loops and corresponding conditions
   */
  private static class FileLoops extends SubscriptionVisitor {

    private Map<IterationStatementTree, ExpressionTree> loopsAndConditions = new HashMap<>();

    static FileLoops create(ScriptTree scriptTree) {
      FileLoops fileLoops = new FileLoops();
      fileLoops.scanTree(scriptTree);
      return fileLoops;
    }

    @Override
    public Set<Kind> nodesToVisit() {
      return ImmutableSet.of(Kind.FOR_STATEMENT, Kind.WHILE_STATEMENT, Kind.DO_WHILE_STATEMENT);
    }

    @Override
    public void visitNode(Tree tree) {
      loopsAndConditions.put((IterationStatementTree) tree, ((ConditionalTree) tree).condition());
    }
  }

  private static boolean alwaysTrue(Collection<Constraint> results) {
    if (results.size() == 1) {
      Constraint constraint = results.iterator().next();
      return Constraint.TRUTHY.equals(constraint);
    }

    return false;
  }

  private boolean isInfiniteLoop(IterationStatementTree tree, @Nullable JavaScriptTree condition) {
    if (isNeverExecutedLoop(condition)) {
      return false;
    }
    ControlFlowGraph flowGraph = CheckUtils.buildControlFlowGraph(tree);
    Map<Tree, CfgBlock> treesOfFlowGraph = treesToBlocks(flowGraph);
    if (isBrokenLoop(condition, tree, flowGraph)) {
      return false;
    }
    return condition == null || !conditionIsUpdated(condition, (JavaScriptTree) tree, treesOfFlowGraph) || alwaysTrueConditions.contains(condition);
  }

  private static boolean isBrokenLoop(@Nullable JavaScriptTree condition, IterationStatementTree loopTree, ControlFlowGraph flowGraph) {
    Loop loop = new Loop(flowGraph, loopTree, condition);
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
    return usage.identifierTree().parent().is(Tree.Kind.DOT_MEMBER_EXPRESSION, Tree.Kind.BRACKET_MEMBER_EXPRESSION, Tree.Kind.CALL_EXPRESSION);
  }

  private static class Loop {
    private final Set<CfgBranchingBlock> branchBlocks;
    private final Set<CfgBlock> loopBlocks;

    Loop(ControlFlowGraph flowGraph, IterationStatementTree iteration, @Nullable JavaScriptTree condition) {
      branchBlocks = findRootBranchingBlocks(flowGraph, iteration, condition);
      final Map<Tree, CfgBlock> treesOfFlowGraph = treesToBlocks(flowGraph);
      Set<CfgBlock> foundLoopBlocks = findLoopBlocks(iteration, treesOfFlowGraph);
      branchBlocks.forEach(foundLoopBlocks::add);
      this.loopBlocks = foundLoopBlocks;
    }

    private static Set<CfgBranchingBlock> findRootBranchingBlocks(ControlFlowGraph flowGraph, IterationStatementTree iteration, @Nullable JavaScriptTree condition) {
      return flowGraph.blocks().stream()
        .filter(cfgBlock -> cfgBlock instanceof CfgBranchingBlock)
        .map(cfgBlock -> (CfgBranchingBlock) cfgBlock)
        .filter(cfgBranchingBlock -> blockBelongsToLoopEndCondition(cfgBranchingBlock, iteration, condition))
        .collect(Collectors.toSet());
    }

    private static boolean blockBelongsToLoopEndCondition(CfgBranchingBlock cfgBranchingBlock, IterationStatementTree iteration, @Nullable JavaScriptTree condition) {
      final Tree branchingTree = cfgBranchingBlock.branchingTree();
      if (iteration.equals(branchingTree)) {
        return true;
      }
      if (condition != null) {
        return condition.equals(branchingTree)
          || condition.isAncestorOf(branchingTree);
      }
      return false;
    }

    private static Set<CfgBlock> findLoopBlocks(IterationStatementTree iterationStatement, Map<Tree, CfgBlock> treesOfFlowGraph) {
      Stream<JavaScriptTree> iterationTrees = iterationStatement.statement().descendants();
      iterationTrees = addUpdateExpression(iterationStatement, iterationTrees);
      return iterationTrees.map(treesOfFlowGraph::get).filter(Objects::nonNull).collect(Collectors.toSet());
    }

    private static Stream<JavaScriptTree> addUpdateExpression(IterationStatementTree iterationStatement, Stream<JavaScriptTree> iterationTrees) {
      if (iterationStatement instanceof ForStatementTree) {
        return Stream.concat(iterationTrees, Stream.of((JavaScriptTree) ((ForStatementTree) iterationStatement).update()));
      }
      return iterationTrees;
    }

    Set<CfgBlock> jumpingExits() {
      Set<CfgBlock> exits = exits();
      branchBlocks.forEach(exits::remove);
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
      .map(IdentifierTree::symbol)
      .filter(Optional::isPresent)
      .map(Optional::get);
  }

  private static Stream<Usage> allSymbolsUsages(JavaScriptTree root) {
    return allSymbols(root).flatMap(symbol -> symbol.usages().stream()).filter(usage -> root.isAncestorOf(usage.identifierTree()));
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
        addIssue(tree.forKeyword(), "Add an end condition for this loop.").secondary(new IssueLocation(tree.firstSemicolonToken(), tree.secondSemicolonToken(), null));
      } else {
        createIssue(tree.forKeyword(), tree.condition());
      }
    }

    private void createIssue(Tree keyword, ExpressionTree condition) {
      LoopsShouldNotBeInfiniteCheck.this.addIssue(keyword, "Correct this loop's end condition as to not be invariant.")
        .secondary(new IssueLocation(condition, null));
    }

  }

}
