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

import java.util.ArrayList;
import java.util.List;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.BinaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.CaseClauseTree;
import org.sonar.plugins.javascript.api.tree.statement.DoWhileStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.IfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.WhileStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ComplexityVisitor extends DoubleDispatchVisitor {

  private boolean mustAnalyseNestedFunctions;

  private List<Tree> complexityTrees;

  private boolean isInsideFunction;

  public ComplexityVisitor(boolean mustAnalyseNestedFunctions) {
    this.mustAnalyseNestedFunctions = mustAnalyseNestedFunctions;
  }

  public int getComplexity(Tree tree) {
    return complexityTrees(tree).size();
  }

  public List<Tree> complexityTrees(Tree tree) {
    this.complexityTrees = new ArrayList<>();
    this.isInsideFunction = false;
    scan(tree);
    return this.complexityTrees;
  }

  private void visitFunction(FunctionTree functionTree, Tree complexityTree) {
    if (mustAnalyse()) {
      add(complexityTree);

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
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
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
    visitFunction(tree, tree.doubleArrowToken());
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
  public void visitConditionalExpression(ConditionalExpressionTree tree) {
    add(tree.queryToken());
    super.visitConditionalExpression(tree);
  }

  @Override
  public void visitBinaryExpression(BinaryExpressionTree tree) {
    if (tree.is(Kind.CONDITIONAL_AND, Kind.CONDITIONAL_OR)) {
      add(tree.operatorToken());
    }
    super.visitBinaryExpression(tree);
  }

  private boolean mustAnalyse() {
    return mustAnalyseNestedFunctions || !isInsideFunction;
  }

  private void add(Tree tree) {
    complexityTrees.add(tree);
  }

}
