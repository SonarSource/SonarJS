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

import org.sonar.javascript.api.SymbolModelBuilder;
import org.sonar.plugins.javascript.api.visitors.BaseTreeVisitor;
import org.sonar.javascript.model.internal.declaration.InitializedBindingElementTreeImpl;
import org.sonar.javascript.model.internal.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.internal.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.model.internal.statement.CatchBlockTreeImpl;
import org.sonar.javascript.model.internal.statement.VariableDeclarationTreeImpl;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;

import java.util.List;

/**
 * This visitor records all symbol explicitly declared through a declared statement.
 * i.e: Method Declaration,
 */
public class SymbolDeclarationVisitor extends BaseTreeVisitor {

  private SymbolModelBuilder symbolModel;
  private Scope currentScope;

  public SymbolDeclarationVisitor(SymbolModelBuilder symbolModel) {
    this.symbolModel = symbolModel;
    this.currentScope = null;
  }

  @Override
  public void visitScript(ScriptTree tree) {
    newScope(tree);
    addBuiltInSymbols();
    super.visitScript(tree);
    leaveScope();
  }

  private void addBuiltInSymbols() {
    symbolModel.addBuiltInSymbol("eval", new SymbolDeclaration(symbolModel.globalScope().tree(), SymbolDeclaration.Kind.BUILD_IN), Symbol.Kind.FUNCTION, currentScope);
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    newScope(tree);
    addSymbols(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuiltInSymbols();

    super.visitMethodDeclaration(tree);
    leaveScope();
  }

  private void addFunctionBuiltInSymbols() {
    String arguments = "arguments";
    if (currentScope.symbols.get(arguments) == null) {
      symbolModel.addBuiltInSymbol(arguments, new SymbolDeclaration(currentScope.tree(), SymbolDeclaration.Kind.BUILD_IN), Symbol.Kind.VARIABLE, currentScope);
    }
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
    symbolModel.addSymbol(new SymbolDeclaration(tree.name(), SymbolDeclaration.Kind.FUNCTION_DECLARATION), Symbol.Kind.FUNCTION, currentScope);
    newScope(tree);
    addSymbols(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuiltInSymbols();

    super.visitFunctionDeclaration(tree);
    leaveScope();
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    newScope(tree);
    addSymbols(((ArrowFunctionTreeImpl) tree).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuiltInSymbols();

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
      symbolModel.addSymbol(new SymbolDeclaration(name, SymbolDeclaration.Kind.FUNCTION_EXPRESSION), Symbol.Kind.FUNCTION, currentScope);

    }
    addSymbols(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers(), SymbolDeclaration.Kind.PARAMETER, Symbol.Kind.PARAMETER);
    addFunctionBuiltInSymbols();

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
          currentScope.lookupSymbol(identifier.name()).addUsage(
              Usage.create(identifier, Usage.Kind.WRITE)
                  .setUsageTree(bindingElement)
                  .setInitialization(true)
          );
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

  private void addSymbols(List<IdentifierTree> identifiers, SymbolDeclaration.Kind declarationKind, Symbol.Kind symbolKind) {
    for (IdentifierTree identifier : identifiers) {
      symbolModel.addSymbol(new SymbolDeclaration(identifier, declarationKind), symbolKind, currentScope);
    }
  }

  private void newScope(Tree tree) {
    currentScope = new Scope(currentScope, tree);
    symbolModel.addScope(currentScope);
  }

}
