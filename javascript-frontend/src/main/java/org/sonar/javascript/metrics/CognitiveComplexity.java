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
package org.sonar.javascript.metrics;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.KindSet;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BreakStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ContinueStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ElseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;
import org.sonar.plugins.javascript.api.visitors.IssueLocation;
import org.sonar.plugins.javascript.api.visitors.SubscriptionVisitor;

import static org.sonar.plugins.javascript.api.tree.Tree.Kind.CONDITIONAL_AND;
import static org.sonar.plugins.javascript.api.tree.Tree.Kind.CONDITIONAL_OR;

public class CognitiveComplexity extends DoubleDispatchVisitor {
  private FunctionVisitStrategy functionVisitStrategy = new FunctionVisit();

  private int nestingLevel = 0;
  private int ownComplexity = 0;
  private int nestedFunctionComplexity = 0;

  private boolean functionContainsStructuralComplexity = false;

  private List<IssueLocation> ownIssueLocations = new ArrayList<>();
  private List<IssueLocation> nestedFunctionsIssueLocations = new ArrayList<>();

  private FunctionTree topCognitiveScopeFunction = null;
  private Set<FunctionTree> nestedFunctions = new HashSet<>();
  private Deque<Tree> functionStack = new ArrayDeque<>();
  private Set<Tree> logicalOperationsToIgnore = new HashSet<>();

  public CognitiveComplexity(int declarationNestingLevel) {
    this.nestingLevel = declarationNestingLevel;
  }

  public CognitiveComplexity() {
  }

  public ComplexityData calculateFunctionComplexity(FunctionTree functionTree) {
    topCognitiveScopeFunction = functionTree;
    functionTree.accept(this);
    return buildComplexityData();
  }

  public ComplexityData calculateScriptComplexity(ScriptTree tree) {
    functionVisitStrategy = new NoFunctionVisit();
    tree.accept(this);

    List<FunctionTree> functions = FunctionVisitor.collectAllFunctions(tree);
    Set<CognitiveComplexity.ComplexityData> complexities = new HashSet<>();
    Set<FunctionTree> alreadyProcessedFunctions = new HashSet<>();
    for (FunctionTree function : functions) {
      if(!alreadyProcessedFunctions.contains(function)) {
        int declarationNestingLevel = functionVisitStrategy.functionDeclarationNesting(function);
        ComplexityData complexityData = new CognitiveComplexity(declarationNestingLevel).calculateFunctionComplexity(function);
        complexities.add(complexityData);
        alreadyProcessedFunctions.addAll(complexityData.aggregatedNestedFunctions());

        complexityData.ignoredNestedFunctions.forEach(functionTree -> functionVisitStrategy.addDeclarationNesting(functionTree, declarationNestingLevel));
      }
    }
    Integer fileComplexity = complexities.stream().map(ComplexityData::complexity).reduce(0, Integer::sum) + ownComplexity;
    List<IssueLocation> locations = complexities.stream().flatMap(data -> data.secondaryLocations().stream()).collect(Collectors.toList());
    locations.addAll(ownIssueLocations);
    return new ComplexityData(fileComplexity, locations, Collections.emptySet(), Collections.emptySet());
  }

  public void clear() {
    topCognitiveScopeFunction = null;
  }

  private ComplexityData buildComplexityData() {
    int complexity;
    Set<FunctionTree> aggregatedNestedFunctions = new HashSet<>();
    List<IssueLocation> allIssueLocations = new ArrayList<>(ownIssueLocations);
    Set<FunctionTree> ignoredNestedFunctions = new HashSet<>();

    if (functionContainsStructuralComplexity) {
      complexity = ownComplexity + nestedFunctionComplexity;
      aggregatedNestedFunctions.addAll(nestedFunctions);
      allIssueLocations.addAll(nestedFunctionsIssueLocations);
    } else {
      complexity = ownComplexity;
      ignoredNestedFunctions = nestedFunctions;
    }

    return new ComplexityData(complexity, allIssueLocations, aggregatedNestedFunctions, ignoredNestedFunctions);
  }

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    if (isElseIf(tree)) {
      addComplexityWithoutNesting(tree.ifKeyword());

    } else {
      addComplexityWithNesting(tree.ifKeyword());
    }

    visit(tree.condition());
    visitWithNesting(tree.statement());
    visit(tree.elseClause());
  }

  @Override
  public void visitElseClause(ElseClauseTree tree) {
    if (tree.statement().is(Tree.Kind.IF_STATEMENT)) {
      visit(tree.statement());

    } else {
      addComplexityWithoutNesting(tree.elseKeyword());
      visitWithNesting(tree.statement());
    }
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    visitLoop(tree.whileKeyword(), tree.statement(), tree.condition());
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    visitLoop(tree.doKeyword(), tree.statement(), tree.condition());
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    visitLoop(tree.forKeyword(), tree.statement(), tree.init(), tree.condition(), tree.update());
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    visitLoop(tree.forKeyword(), tree.statement(), tree.variableOrExpression(), tree.expression());
  }

  private void visitLoop(SyntaxToken secondaryLocationToken, Tree loopBody, Tree... notNestedElements) {
    addComplexityWithNesting(secondaryLocationToken);
    visit(notNestedElements);
    visitWithNesting(loopBody);
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    addComplexityWithNesting(tree.catchKeyword());
    visitWithNesting(tree.block());
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    addComplexityWithNesting(tree.switchKeyword());
    nestingLevel++;
    super.visitSwitchStatement(tree);
    nestingLevel--;
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (tree.is(CONDITIONAL_AND, CONDITIONAL_OR)) {
      JavaScriptTree javaScriptTree = (JavaScriptTree) tree;

      ExpressionTree leftChild = removeParenthesis(tree.leftOperand());
      ExpressionTree rightChild = removeParenthesis(tree.rightOperand());

      boolean leftChildOfSameKind = leftChild.is(javaScriptTree.getKind());
      boolean rightChildOfSameKind = rightChild.is(javaScriptTree.getKind());

      // For expressions with same-kind operators like "a && (b && c)" we want to have secondary location on leftmost operator
      // So we "ignore" right operand
      if (rightChildOfSameKind) {
        logicalOperationsToIgnore.add(rightChild);
      }

      // And we add complexity for leftmost operator
      if (!logicalOperationsToIgnore.contains(tree) && !leftChildOfSameKind) {
        addComplexityWithoutNesting(tree.operatorToken());
      }

    }

    super.visitBinaryExpression(tree);
  }

  private static ExpressionTree removeParenthesis(ExpressionTree expressionTree) {
    if (expressionTree.is(Tree.Kind.PARENTHESISED_EXPRESSION)) {
      return removeParenthesis(((ParenthesisedExpressionTree) expressionTree).expression());
    } else {
      return expressionTree;
    }
  }

  @Override
  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    addComplexityWithNesting(tree.queryToken());

    visit(tree.condition());

    visitWithNesting(tree.trueExpression());
    visitWithNesting(tree.falseExpression());
  }

  @Override
  public void visitBreakStatement(BreakStatementTree tree) {
    visitJumpStatement(tree.breakKeyword(), tree.labelToken());
    super.visitBreakStatement(tree);
  }

  @Override
  public void visitContinueStatement(ContinueStatementTree tree) {
    visitJumpStatement(tree.continueKeyword(), tree.labelToken());
    super.visitContinueStatement(tree);
  }

  private void visitJumpStatement(SyntaxToken keyword, @Nullable SyntaxToken label) {
    if (label != null) {
      addComplexityWithoutNesting(keyword);
    }
  }

  private void visit(Tree... trees) {
    for (Tree tree : trees) {
      if (tree != null) {
        tree.accept(this);
      }
    }
  }

  private void visitWithNesting(Tree tree) {
    nestingLevel++;
    tree.accept(this);
    nestingLevel--;
  }

  private void addComplexityWithNesting(SyntaxToken secondaryLocationToken) {
    if (isWithinTopCognitiveScope()) {
      functionContainsStructuralComplexity = true;
    }
    addComplexity(nestingLevel + 1, secondaryLocationToken);
  }

  private void addComplexityWithoutNesting(SyntaxToken secondaryLocationToken) {
    addComplexity(1, secondaryLocationToken);
  }

  private void addComplexity(int addedComplexity, SyntaxToken secondaryLocationToken) {
    IssueLocation secondaryLocation = new IssueLocation(secondaryLocationToken, secondaryMessage(addedComplexity));
    if (isWithinTopCognitiveScope()) {
      ownComplexity += addedComplexity;
      ownIssueLocations.add(secondaryLocation);
    } else {
      nestedFunctionComplexity += addedComplexity;
      nestedFunctionsIssueLocations.add(secondaryLocation);
    }
  }

  private boolean isWithinTopCognitiveScope() {
    return functionStack.isEmpty() || functionStack.peek().equals(topCognitiveScopeFunction);
  }

  private static String secondaryMessage(int complexity) {
    if (complexity == 1) {
      return "+1";

    } else {
      return String.format("+%s (incl. %s for nesting)", complexity, complexity - 1);
    }
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    functionVisitStrategy.visitFunctionDeclaration(tree);
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    functionVisitStrategy.visitArrowFunction(tree);
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    functionVisitStrategy.visitFunctionExpression(tree);
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    functionVisitStrategy.visitMethodDeclaration(tree);
  }

  @Override
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    functionVisitStrategy.visitAccessorMethodDeclaration(tree);
  }

  private static boolean isElseIf(IfStatementTree tree) {
    return tree.parent().is(Tree.Kind.ELSE_CLAUSE);
  }

  public static class ComplexityData {
    private int complexity;
    private List<IssueLocation> secondaryLocations;
    private Set<FunctionTree> aggregatedNestedFunctions;
    private Set<FunctionTree> ignoredNestedFunctions;

    ComplexityData(int complexity, List<IssueLocation> secondaryLocations, Set<FunctionTree> aggregatedNestedFunctions, Set<FunctionTree> ignoredNestedFunctions) {
      this.complexity = complexity;
      this.secondaryLocations = secondaryLocations;
      this.aggregatedNestedFunctions = aggregatedNestedFunctions;
      this.ignoredNestedFunctions = ignoredNestedFunctions;
    }

    public int complexity() {
      return complexity;
    }

    public List<IssueLocation> secondaryLocations() {
      return secondaryLocations;
    }

    public Set<FunctionTree> aggregatedNestedFunctions() {
      return aggregatedNestedFunctions;
    }
  }

  private static class FunctionVisitor extends SubscriptionVisitor {
    private List<FunctionTree> collectedFunctions = new ArrayList<>();

    public static List<FunctionTree> collectAllFunctions(ScriptTree tree) {
      FunctionVisitor functionVisitor = new FunctionVisitor();
      functionVisitor.scanTree(tree);
      return functionVisitor.collectedFunctions;
    }

    @Override
    public Set<Kind> nodesToVisit() {
      return KindSet.FUNCTION_KINDS.getSubKinds();
    }

    @Override
    public void visitNode(Tree tree) {
      collectedFunctions.add((FunctionTree) tree);
    }
  }

  private interface FunctionVisitStrategy {
    default void visitFunctionExpression(FunctionExpressionTree tree){}
    default void visitFunctionDeclaration(FunctionDeclarationTree tree){}
    default void visitMethodDeclaration(MethodDeclarationTree tree){}
    default void visitArrowFunction(ArrowFunctionTree tree){}
    default void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree){}

    default int functionDeclarationNesting(FunctionTree tree) {
      return 0;
    }

    default void addDeclarationNesting(FunctionTree functionTree, int declarationNestingLevel){}
  }

  private class NoFunctionVisit implements FunctionVisitStrategy {
    Map<FunctionTree, Integer> functionDeclarationNesting = new HashMap<>();

    private void saveNestingLevel(FunctionTree tree) {
      functionDeclarationNesting.put(tree, nestingLevel);
    }

    @Override
    public void visitFunctionExpression(FunctionExpressionTree tree) {
      saveNestingLevel(tree);
    }

    @Override
    public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
      saveNestingLevel(tree);
    }

    @Override
    public void visitMethodDeclaration(MethodDeclarationTree tree) {
      saveNestingLevel(tree);
    }

    @Override
    public void visitArrowFunction(ArrowFunctionTree tree) {
      saveNestingLevel(tree);
    }

    @Override
    public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
      saveNestingLevel(tree);
    }

    @Override
    public int functionDeclarationNesting(FunctionTree tree) {
      return functionDeclarationNesting.getOrDefault(tree, 0);
    }

    @Override
    public void addDeclarationNesting(FunctionTree functionTree, int declarationNestingLevel) {
      functionDeclarationNesting.put(functionTree, declarationNestingLevel);
    }
  }

  private class FunctionVisit implements FunctionVisitStrategy {

    private void visitFunction(FunctionTree tree, Runnable propagation) {
      functionStack.push(tree);

      if (!isWithinTopCognitiveScope()) {
        nestedFunctions.add(tree);
        nestingLevel++;

      }
      propagation.run();
      nestingLevel--;
      functionStack.pop();
    }

    @Override
    public void visitFunctionExpression(FunctionExpressionTree tree) {
      visitFunction(tree, () -> CognitiveComplexity.super.visitFunctionExpression(tree));
    }

    @Override
    public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
      visitFunction(tree, () -> CognitiveComplexity.super.visitFunctionDeclaration(tree));
    }

    @Override
    public void visitMethodDeclaration(MethodDeclarationTree tree) {
      visitFunction(tree, () -> CognitiveComplexity.super.visitMethodDeclaration(tree));
    }

    @Override
    public void visitArrowFunction(ArrowFunctionTree tree) {
      visitFunction(tree, () -> CognitiveComplexity.super.visitArrowFunction(tree));
    }

    @Override
    public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
      visitFunction(tree, () -> CognitiveComplexity.super.visitAccessorMethodDeclaration(tree));
    }
  }
}
