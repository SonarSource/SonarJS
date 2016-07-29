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
package org.sonar.javascript.metrics;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ReturnStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.StatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ThrowStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ComplexityVisitor extends DoubleDispatchVisitor {

  private boolean mustAnalyseNestedFunctions;

  private List<Tree> complexityTrees;

  private Set<Tree> excludedReturns;

  private boolean isInsideFunction;

  public ComplexityVisitor(boolean mustAnalyseNestedFunctions) {
    this.mustAnalyseNestedFunctions = mustAnalyseNestedFunctions;
  }

  public int getComplexity(Tree tree) {
    return complexityTrees(tree).size();
  }

  public List<Tree> complexityTrees(Tree tree) {
    this.complexityTrees = new ArrayList<>();
    this.excludedReturns = new HashSet<>();
    this.isInsideFunction = false;
    scan(tree);
    return this.complexityTrees;
  }

  private void visitFunction(FunctionTree functionTree, Tree complexityTree) {
    if (mustAnalyse()) {
      add(complexityTree);
      if (functionTree.body().is(Kind.BLOCK)) {
        excludeLastReturn(((BlockTree) functionTree.body()).statements());
      }
      isInsideFunction = true;
      scanChildren(functionTree);
      isInsideFunction = false;
    }
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    visitFunction(tree, tree.name());
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    visitFunction(tree, tree.functionKeyword());
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    visitFunction(tree, tree.functionKeyword());
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    visitFunction(tree, tree.doubleArrow());
  }

  @Override
  public void visitIfStatement(IfStatementTree tree) {
    add(tree.ifKeyword());
    super.visitIfStatement(tree);
  }

  @Override
  public void visitWhileStatement(WhileStatementTree tree) {
    add(tree.whileKeyword());
    super.visitWhileStatement(tree);
  }

  @Override
  public void visitDoWhileStatement(DoWhileStatementTree tree) {
    add(tree.doKeyword());
    super.visitDoWhileStatement(tree);
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    add(tree.forKeyword());
    super.visitForStatement(tree);
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    add(tree.forKeyword());
    super.visitForObjectStatement(tree);
  }

  @Override
  public void visitCaseClause(CaseClauseTree tree) {
    add(tree.keyword());
    super.visitCaseClause(tree);
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    add(tree.catchKeyword());
    super.visitCatchBlock(tree);
  }

  @Override
  public void visitReturnStatement(ReturnStatementTree tree) {
    if (!excludedReturns.contains(tree)) {
      add(tree.returnKeyword());
    }
    super.visitReturnStatement(tree);
  }

  @Override
  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    add(tree.query());
    super.visitConditionalExpression(tree);
  }

  @Override
  public void visitThrowStatement(ThrowStatementTree tree) {
    add(tree.throwKeyword());
    super.visitThrowStatement(tree);
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (tree.is(Kind.CONDITIONAL_AND, Kind.CONDITIONAL_OR)) {
      add(tree.operator());
    }
    super.visitBinaryExpression(tree);
  }

  private boolean mustAnalyse() {
    return mustAnalyseNestedFunctions || !isInsideFunction;
  }

  private void excludeLastReturn(List<StatementTree> statements) {
    if (statements.isEmpty()) {
      return;
    }
    StatementTree tree = statements.get(statements.size() - 1);
    if (tree.is(Kind.RETURN_STATEMENT)) {
      excludedReturns.add(tree);
    }
  }

  private void add(Tree tree) {
    complexityTrees.add(tree);
  }

}
