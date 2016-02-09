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

import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.highlighter.HighlightSymbolTableBuilder;
import org.sonar.javascript.lexer.JavaScriptPunctuator;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.SymbolModel;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.GeneratorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.AssignmentExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForOfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class SymbolVisitor extends DoubleDispatchVisitor {

  private static final Logger LOG = LoggerFactory.getLogger(SymbolVisitor.class);

  private final Symbolizable symbolizable;

  private SymbolModelBuilder symbolModel;
  private Scope currentScope;

  public SymbolVisitor(SymbolModelBuilder symbolModel, @Nullable Symbolizable symbolizable) {
    this.symbolModel = symbolModel;
    this.currentScope = null;

    // Symbol highlighting
    this.symbolizable = symbolizable;
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

  private boolean isScopeAlreadyEntered(BlockTree tree) {
    for (Scope scope : symbolModel.getScopes()) {
      if (scope.tree().equals(tree)) {
        return false;
      }
    }
    return true;
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
  public void visitScript(ScriptTree tree) {
    // First pass to record symbol declarations
    new SymbolDeclarationVisitor(symbolModel).visitScript(tree);

    enterScope(tree);
    // Record usage and implicit symbol declarations
    super.visitScript(tree);
    leaveScope();

    highlightSymbols();
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    enterScope(tree);
    super.visitMethodDeclaration(tree);
    leaveScope();
  }

  @Override
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    enterScope(tree);
    super.visitAccessorMethodDeclaration(tree);
    leaveScope();
  }

  @Override
  public void visitGeneratorMethodDeclaration(GeneratorMethodDeclarationTree tree) {
    enterScope(tree);
    super.visitGeneratorMethodDeclaration(tree);
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
    if (tree.variable() instanceof IdentifierTree) {
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
    if (tree.is(Tree.Kind.IDENTIFIER_REFERENCE)) {
      addUsageFor(tree, Usage.Kind.READ);
    }
  }

  @Override
  public void visitUnaryExpression(UnaryExpressionTree tree) {
    if (isIncDec(tree) && tree.expression().is(Tree.Kind.IDENTIFIER_REFERENCE)) {
      addUsageFor((IdentifierTree) tree.expression(), Usage.Kind.READ_WRITE);
    } else {
      super.visitUnaryExpression(tree);
    }
  }

  private static boolean isIncDec(UnaryExpressionTree tree) {
    return tree.is(
      Tree.Kind.PREFIX_INCREMENT,
      Tree.Kind.PREFIX_DECREMENT,
      Tree.Kind.POSTFIX_INCREMENT,
      Tree.Kind.POSTFIX_DECREMENT
    );
  }

  @Override
  public void visitForOfStatement(ForOfStatementTree tree) {
    enterScope(tree);

    if (tree.variableOrExpression() instanceof IdentifierTree) {
      IdentifierTree identifier = (IdentifierTree) tree.variableOrExpression();

      if (!addUsageFor(identifier, Usage.Kind.WRITE)) {
        symbolModel.declareSymbol(identifier.name(), Symbol.Kind.VARIABLE, symbolModel.globalScope()).addUsage(Usage.create(identifier, Usage.Kind.WRITE));
      }
    }
    super.visitForOfStatement(tree);

    leaveScope();
  }

  @Override
  public void visitForInStatement(ForInStatementTree tree) {
    enterScope(tree);

    if (tree.variableOrExpression() instanceof IdentifierTree) {
      IdentifierTree identifier = (IdentifierTree) tree.variableOrExpression();

      if (!addUsageFor(identifier, Usage.Kind.WRITE)) {
        symbolModel.declareSymbol(identifier.name(), Symbol.Kind.VARIABLE, symbolModel.globalScope()).addUsage(Usage.create(identifier, Usage.Kind.WRITE));
      }

      scan(tree.expression());
      scan(tree.statement());

    } else {
      super.visitForInStatement(tree);
    }

    leaveScope();
  }

  /*
   * HELPERS
   */
  private void leaveScope() {
    if (currentScope != null) {
      currentScope = currentScope.outer();
    }
  }

  private void enterScope(Tree tree) {
    currentScope = getScopeFor(tree);
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

  private void highlightSymbols() {
    if (symbolizable != null) {
      symbolizable.setSymbolTable(HighlightSymbolTableBuilder.build(symbolizable, (SymbolModel) symbolModel));
    } else {
      LOG.warn("Symbol in source view will not be highlighted.");
    }
  }

  private Scope getScopeFor(Tree tree) {
    for (Scope scope : symbolModel.getScopes()) {
      if (scope.tree().equals(tree)) {
        return scope;
      }
    }
    throw new IllegalStateException("No scope found for the tree");
  }
}
