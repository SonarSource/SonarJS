/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.tree.symbols;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.sonar.javascript.tree.impl.declaration.FunctionDeclarationTreeImpl;
import org.sonar.javascript.tree.impl.declaration.FunctionTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.tree.impl.expression.FunctionExpressionTreeImpl;
import org.sonar.javascript.tree.impl.expression.IdentifierTreeImpl;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

/**
 * This visitor creates scopes.
 */
public class ScopeVisitor extends DoubleDispatchVisitor {

  private SymbolModelBuilder symbolModel;
  private Scope currentScope;
  private Map<Tree, Scope> treeScopeMap;

  // List of block trees for which scope is created for another tree (e.g. function declaration or for statement)
  private List<BlockTree> skippedBlocks;

  public Map<Tree, Scope> getTreeScopeMap() {
    return treeScopeMap;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    this.symbolModel = (SymbolModelBuilder) getContext().getSymbolModel();
    this.currentScope = null;
    this.skippedBlocks = new ArrayList<>();
    this.treeScopeMap = new HashMap<>();

    newFunctionScope(tree);
    super.visitScript(tree);
    leaveScope();
  }

  @Override
  public void visitBlock(BlockTree tree) {
    if (isScopeAlreadyCreated(tree)) {
      super.visitBlock(tree);

    } else {
      newBlockScope(tree);
      super.visitBlock(tree);
      leaveScope();
    }
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    newBlockScope(tree);

    skipBlock(tree.statement());
    super.visitForStatement(tree);

    leaveScope();
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    newBlockScope(tree);

    skipBlock(tree.statement());
    super.visitForObjectStatement(tree);

    leaveScope();
  }

  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    scan(tree.expression());

    newBlockScope(tree);
    scan(tree.cases());
    leaveScope();
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    newFunctionScope(tree);

    ((FunctionTreeImpl) tree).scope(currentScope);

    skipBlock(tree.body());
    super.visitMethodDeclaration(tree);

    leaveScope();
  }

  @Override
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    newFunctionScope(tree);

    ((FunctionTreeImpl) tree).scope(currentScope);

    skipBlock(tree.body());
    super.visitAccessorMethodDeclaration(tree);

    leaveScope();
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    newBlockScope(tree);

    skipBlock(tree.block());
    super.visitCatchBlock(tree);

    leaveScope();
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    newFunctionScope(tree);
    ((FunctionDeclarationTreeImpl) tree).scope(currentScope);

    skipBlock(tree.body());
    super.visitFunctionDeclaration(tree);

    leaveScope();
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    newFunctionScope(tree);
    ((ArrowFunctionTreeImpl) tree).scope(currentScope);

    skipBlock(tree.body());
    super.visitArrowFunction(tree);

    leaveScope();
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    newFunctionScope(tree);
    ((FunctionExpressionTreeImpl) tree).scope(currentScope);

    skipBlock(tree.body());
    super.visitFunctionExpression(tree);

    leaveScope();
  }

  @Override
  public void visitClass(ClassTree tree) {
    newBlockScope(tree);

    super.visitClass(tree);

    leaveScope();
  }

  @Override
  public void visitIdentifier(IdentifierTree tree) {
    ((IdentifierTreeImpl) tree).scope(currentScope);
  }

  private void leaveScope() {
    if (currentScope != null) {
      currentScope = currentScope.outer();
    }
  }

  private void newFunctionScope(Tree tree) {
    newScope(tree, false);
  }

  private void newBlockScope(Tree tree) {
    newScope(tree, true);
  }

  private void newScope(Tree tree, boolean isBlock) {
    currentScope = new Scope(currentScope, tree, isBlock);
    treeScopeMap.put(tree, currentScope);
    symbolModel.addScope(currentScope);
  }

  private void skipBlock(Tree tree) {
    if (tree.is(Kind.BLOCK)) {
      skippedBlocks.add((BlockTree) tree);
    }
  }

  private boolean isScopeAlreadyCreated(BlockTree tree) {
    return skippedBlocks.contains(tree);
  }

}
