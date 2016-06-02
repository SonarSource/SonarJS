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
package org.sonar.javascript.tree.symbols;

import java.util.Map;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.javascript.tree.TreeKinds;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

/**
 * This visitor creates new symbols for not hoisted variables (like class name) and implicitly declared variables (declared without keyword).
 * Also it creates usages for all known symbols.
 */
public class SymbolVisitor extends DoubleDispatchVisitor {

  private SymbolModelBuilder symbolModel;
  private Scope currentScope;
  private Map<Tree, Scope> treeScopeMap;

  public SymbolVisitor(Map<Tree, Scope> treeScopeMap) {
    this.treeScopeMap = treeScopeMap;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    this.symbolModel = (SymbolModelBuilder) getContext().getSymbolModel();
    this.currentScope = null;

    enterScope(tree);
    super.visitScript(tree);
    leaveScope();
  }


  @Override
  public void visitBlock(BlockTree tree) {
    if (isScopeAlreadyEntered(tree)) {
      super.visitBlock(tree);

    } else {
      enterScope(tree);
      super.visitBlock(tree);
      leaveScope();
    }
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    scan(tree.init());

    enterScope(tree);

    scan(tree.condition());
    scan(tree.update());
    scan(tree.statement());

    leaveScope();
  }


  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    scan(tree.expression());

    enterScope(tree);
    scan(tree.cases());
    leaveScope();
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    enterScope(tree);
    super.visitMethodDeclaration(tree);
    leaveScope();
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    enterScope(tree);
    super.visitCatchBlock(tree);
    leaveScope();
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    enterScope(tree);
    super.visitFunctionDeclaration(tree);
    leaveScope();
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    enterScope(tree);
    super.visitFunctionExpression(tree);
    leaveScope();
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    enterScope(tree);
    super.visitArrowFunction(tree);
    leaveScope();
  }

  /**
   * When an assignment is done to a symbol that has not been declared before,
   * a global variable is created with the left-hand side identifier as name.
   */
  @Override
  public void visitAssignmentExpression(AssignmentExpressionTree tree) {
    if (tree.variable().is(Kind.IDENTIFIER_REFERENCE)) {
      IdentifierTree identifier = (IdentifierTree) tree.variable();
      Usage.Kind usageKind = Usage.Kind.WRITE;
      if (!tree.operator().text().equals(JavaScriptPunctuator.EQU.getValue())) {
        usageKind = Usage.Kind.READ_WRITE;
      }

      if (!addUsageFor(identifier, usageKind)) {
        Symbol symbol = symbolModel.declareSymbol(identifier.name(), Symbol.Kind.VARIABLE, symbolModel.globalScope());
        symbol.addUsage(
          Usage.create(identifier, usageKind)
        );
      }
      // no need to inferType variable has it has been handle
      scan(tree.expression());

    } else {
      super.visitAssignmentExpression(tree);
    }
  }

  @Override
  public void visitIdentifier(IdentifierTree tree) {
    if (tree.is(Tree.Kind.IDENTIFIER_REFERENCE, Kind.THIS) && !addUsageFor(tree, Usage.Kind.READ)) {
      Symbol newSymbol = symbolModel.declareSymbol(tree.name(), Symbol.Kind.VARIABLE, symbolModel.globalScope());
      newSymbol.addUsage(Usage.create(tree, Usage.Kind.READ));
      newSymbol.setBuiltIn(true);
    }
  }

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (TreeKinds.isIncrementOrDecrement(tree) && tree.expression().is(Tree.Kind.IDENTIFIER_REFERENCE)) {
      addUsageFor((IdentifierTree) tree.expression(), Usage.Kind.READ_WRITE);
    } else {
      super.visitUnaryExpression(tree);
    }
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    enterScope(tree);

    if (tree.variableOrExpression().is(Kind.IDENTIFIER_REFERENCE)) {
      IdentifierTree identifier = (IdentifierTree) tree.variableOrExpression();

      if (!addUsageFor(identifier, Usage.Kind.WRITE)) {
        symbolModel.declareSymbol(identifier.name(), Symbol.Kind.VARIABLE, symbolModel.globalScope()).addUsage(Usage.create(identifier, Usage.Kind.WRITE));
      }

      scan(tree.expression());
      scan(tree.statement());

    } else {
      super.visitForObjectStatement(tree);
    }

    leaveScope();
  }

  private void leaveScope() {
    if (currentScope != null) {
      currentScope = currentScope.outer();
    }
  }

  private void enterScope(Tree tree) {
    currentScope = treeScopeMap.get(tree);
    if (currentScope == null) {
      throw new IllegalStateException("No scope found for the tree");
    }
  }

  /**
   * @return true if symbol found and usage recorded, false otherwise.
   */
  private boolean addUsageFor(IdentifierTree identifier, Usage.Kind kind) {
    Symbol symbol = currentScope.lookupSymbol(identifier.name());
    if (symbol != null) {
      symbol.addUsage(Usage.create(identifier, kind));
      return true;
    }
    return false;
  }

  private boolean isScopeAlreadyEntered(BlockTree tree) {
    return !treeScopeMap.containsKey(tree);
  }

}
