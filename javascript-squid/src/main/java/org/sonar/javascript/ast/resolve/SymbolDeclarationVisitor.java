/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.ast.resolve;

import org.sonar.javascript.ast.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.implementations.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.model.implementations.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.implementations.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.model.implementations.statement.CatchBlockTreeImpl;
import org.sonar.javascript.model.implementations.statement.VariableDeclarationTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.BindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.FunctionDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.MethodDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.FunctionExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.statement.CatchBlockTree;
import org.sonar.javascript.model.interfaces.statement.VariableDeclarationTree;

import java.util.List;

/**
 * This visitor records all symbol explicitly declared through a declared statement.
 * i.e: Method Declaration,
 */
public class SymbolDeclarationVisitor extends BaseTreeVisitor {

  private SymbolModel symbolModel;
  private Scope currentScope;

  public SymbolDeclarationVisitor(SymbolModel symbolModel) {
    this.symbolModel = symbolModel;
    this.currentScope = null;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    newScope(tree);
    super.visitScript(tree);
    leaveScope();
  }


  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    newScope(tree);
    addSymbols(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuildInSymbols();

    super.visitMethodDeclaration(tree);
    leaveScope();
  }

  private void addFunctionBuildInSymbols() {
    String arguments = "arguments";
    if (currentScope.symbols.get(arguments) == null) {
      createBuildInSymbolForScope(arguments, currentScope, Symbol.Kind.VARIABLE);
    }
  }

  private void createBuildInSymbolForScope(String name, Scope scope, Symbol.Kind kind) {
    Symbol symbol = scope.createBuildInSymbol(name, kind);
    symbolModel.setScopeForSymbol(symbol, scope);
    symbolModel.setScopeFor(scope.getTree(), scope);
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    newScope(tree);
    addSymbols(((CatchBlockTreeImpl) tree).parameterIdentifiers(), SymbolDeclaration.Kind.CATCH_BLOCK, Symbol.Kind.VARIABLE);

    super.visitCatchBlock(tree);
    leaveScope();
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    addSymbol(tree.name().name(), new SymbolDeclaration(tree.name(), SymbolDeclaration.Kind.FUNCTION_DECLARATION), Symbol.Kind.FUNCTION);
    newScope(tree);
    addSymbols(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuildInSymbols();

    super.visitFunctionDeclaration(tree);
    leaveScope();
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    newScope(tree);
    addSymbols(((ArrowFunctionTreeImpl) tree).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuildInSymbols();

    super.visitArrowFunction(tree);
    leaveScope();
  }

  /**
   * Detail about <a href="http://people.mozilla.org/~jorendorff/es6-draft.html#sec-function-definitions-runtime-semantics-evaluation">Function Expression scope</a>
   * <blockquote>
   *  The BindingIdentifier in a FunctionExpression can be referenced from inside the FunctionExpression's FunctionBody
   *  to allow the function to call itself recursively. However, unlike in a FunctionDeclaration, the BindingIdentifier
   *  in a FunctionExpression cannot be referenced from and does not affect the scope enclosing the FunctionExpression.
   * </blockquote>
   **/
  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    newScope(tree);
    IdentifierTree name = tree.name();
    if (name != null) {
      // Not available in enclosing scope
      addSymbol(name.name(), new SymbolDeclaration(name, SymbolDeclaration.Kind.FUNCTION_EXPRESSION), Symbol.Kind.FUNCTION);
    }
    addSymbols(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuildInSymbols();

    super.visitFunctionExpression(tree);
    leaveScope();
  }

  @Override
  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    addSymbols(((VariableDeclarationTreeImpl) tree).variableIdentifiers(), SymbolDeclaration.Kind.VARIABLE_DECLARATION, Symbol.Kind.VARIABLE);
    addUsages(tree);
    super.visitVariableDeclaration(tree);
  }

  public void addUsages(VariableDeclarationTree tree) {
    for (BindingElementTree bindingElement : tree.variables()) {
      if (bindingElement.is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
        for (IdentifierTree identifier : ((InitializedBindingElementTreeImpl) bindingElement).bindingIdentifiers()){
          Usage.createInit(symbolModel, currentScope.lookupSymbol(identifier.name()), identifier, bindingElement, Usage.Kind.WRITE, currentScope);
        }
      }
    }
  }

  /*
   * HELPERS
   */
  private void leaveScope() {
    if (currentScope != null) {
      currentScope = currentScope.outer();
    }
  }

  private void setScopeForTree(Tree tree) {
    symbolModel.setScopeFor(tree, currentScope);
  }

  private void addSymbol(String name, SymbolDeclaration declaration, Symbol.Kind kind) {
    Symbol symbol = currentScope.createSymbol(name, declaration, kind);
    symbolModel.setScopeForSymbol(symbol, currentScope);
    setScopeForTree(declaration.tree());
  }

  private void addSymbols(List<IdentifierTree> identifiers, SymbolDeclaration.Kind declarationKind, Symbol.Kind symbolKind) {
    for (IdentifierTree identifier : identifiers) {
      addSymbol(identifier.name(), new SymbolDeclaration(identifier, declarationKind), symbolKind);
    }
  }

  private void newScope(Tree tree) {
    currentScope = new Scope(currentScope, tree);
    setScopeForTree(tree);
  }

}
