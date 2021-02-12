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

import java.util.List;
import java.util.Map;
import org.sonar.api.config.Configuration;
import org.sonar.javascript.tree.impl.declaration.ClassTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ParameterListTreeImpl;
import org.sonar.javascript.tree.impl.expression.ArrowFunctionTreeImpl;
import org.sonar.javascript.tree.impl.statement.CatchBlockTreeImpl;
import org.sonar.javascript.tree.symbols.type.ObjectType;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ClassTree;
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ImportClauseTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.NameSpaceImportTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowInterfaceDeclarationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAliasStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForObjectStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

/**
 * This visitor creates symbols for:
 *  - explicitly declared symbols (function declaration, local variable with var/let/const)
 *  - built-in symbols (this, arguments)
 *  - parameters
 *  - imported symbols
 */
public class HoistedSymbolVisitor extends DoubleDispatchVisitor {

  private SymbolModelBuilder symbolModel;
  private Scope currentScope;
  private Map<Tree, Scope> treeScopeMap;
  private boolean insideForLoopVariable = false;
  private GlobalVariableNames globalVariableNames;
  private Scope scriptScope;

  public HoistedSymbolVisitor(Map<Tree, Scope> treeScopeMap, Configuration configuration) {
    this.treeScopeMap = treeScopeMap;
    this.globalVariableNames = new GlobalVariableNames(configuration);
  }

  @Override
  public void visitScript(ScriptTree tree) {
    this.symbolModel = (SymbolModelBuilder) getContext().getSymbolModel();

    enterScope(tree);
    scriptScope = currentScope;
    addExternalSymbols();
    super.visitScript(tree);

    leaveScope();
  }

  @Override
  public void visitBlock(BlockTree tree) {
    if (!treeScopeMap.containsKey(tree)) {
      super.visitBlock(tree);

    } else {
      enterScope(tree);
      super.visitBlock(tree);
      leaveScope();
    }
  }

  @Override
  public void visitForStatement(ForStatementTree tree) {
    enterScope(tree);
    super.visitForStatement(tree);
    leaveScope();
  }

  @Override
  public void visitForObjectStatement(ForObjectStatementTree tree) {
    enterScope(tree);
    insideForLoopVariable = true;
    scan(tree.variableOrExpression());
    insideForLoopVariable = false;
    scan(tree.expression());
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
  public void visitSpecifier(SpecifierTree tree) {
    if (tree.is(Kind.IMPORT_SPECIFIER)) {
      declareImportedSymbol(tree.rightName() == null ? tree.leftName() : tree.rightName());
    }
    super.visitSpecifier(tree);
  }

  @Override
  public void visitNameSpaceImport(NameSpaceImportTree tree) {
    declareImportedSymbol(tree.localName());
    super.visitNameSpaceImport(tree);
  }

  @Override
  public void visitImportClause(ImportClauseTree tree) {
    if (tree.firstSubClause().is(Kind.BINDING_IDENTIFIER)) {
      declareImportedSymbol((IdentifierTree) tree.firstSubClause());
    }
    super.visitImportClause(tree);
  }

  private void declareImportedSymbol(IdentifierTree identifierTree) {
    symbolModel.declareSymbol(identifierTree.name(), Symbol.Kind.IMPORT, symbolModel.globalScope())
      .addUsage(identifierTree, Usage.Kind.DECLARATION);
  }

  private void addExternalSymbols() {
    for (String globalSymbolName : globalVariableNames.names()) {
      symbolModel.declareExternalSymbol(globalSymbolName, Symbol.Kind.VARIABLE, currentScope);
    }

    Symbol windowSymbol = symbolModel.declareExternalSymbol("window", Symbol.Kind.VARIABLE, currentScope);
    windowSymbol.addType(ObjectType.WebApiType.WINDOW);

    addThisSymbol();
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    enterScope(tree);
    declareParameters(((ParameterListTreeImpl) tree.parameterClause()).parameterIdentifiers());
    addFunctionBuiltInSymbols();

    super.visitMethodDeclaration(tree);

    leaveScope();
  }

  @Override
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    enterScope(tree);

    declareParameters(((ParameterListTreeImpl) tree.parameterClause()).parameterIdentifiers());
    addFunctionBuiltInSymbols();

    super.visitAccessorMethodDeclaration(tree);

    leaveScope();
  }

  private void addFunctionBuiltInSymbols() {
    String arguments = "arguments";
    if (currentScope.symbols.get(arguments) == null) {
      symbolModel.declareExternalSymbol(arguments, Symbol.Kind.VARIABLE, currentScope);
    }
  }

  private void addThisSymbol() {
    Symbol thisSymbol = symbolModel.declareExternalSymbol("this", Symbol.Kind.VARIABLE, currentScope);
    thisSymbol.addType(ObjectType.create());
  }

  private void addThisSymbol(ClassTree tree) {
    Symbol thisSymbol = symbolModel.declareExternalSymbol("this", Symbol.Kind.VARIABLE, currentScope);
    thisSymbol.addType(((ClassTreeImpl) tree).classType().createObject());
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    enterScope(tree);

    for (IdentifierTree identifier : ((CatchBlockTreeImpl) tree).parameterIdentifiers()) {
      symbolModel.declareSymbol(identifier.name(), Symbol.Kind.VARIABLE, currentScope)
        .addUsage(identifier, Usage.Kind.DECLARATION);
    }

    super.visitCatchBlock(tree);

    leaveScope();
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    symbolModel.declareSymbol(tree.name().name(), Symbol.Kind.FUNCTION, getFunctionScope())
      .addUsage(tree.name(), Usage.Kind.DECLARATION);

    enterScope(tree);
    declareParameters(((ParameterListTreeImpl) tree.parameterClause()).parameterIdentifiers());
    addFunctionBuiltInSymbols();
    addThisSymbol();

    super.visitFunctionDeclaration(tree);

    leaveScope();
  }

  @Override
  public void visitFlowGenericParameter(FlowGenericParameterTree tree) {
    symbolModel.declareSymbol(tree.identifier().name(), Symbol.Kind.FLOW_GENERIC_TYPE, currentScope)
      .addUsage(tree.identifier(), Usage.Kind.LEXICAL_DECLARATION);
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    enterScope(tree);
    declareParameters(((ArrowFunctionTreeImpl) tree).parameterIdentifiers());
    super.visitArrowFunction(tree);
    leaveScope();
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    enterScope(tree);

    IdentifierTree name = tree.name();
    if (name != null) {
      // Not available in enclosing scope
      symbolModel.declareSymbol(name.name(), Symbol.Kind.FUNCTION, currentScope).addUsage(name, Usage.Kind.DECLARATION);

    }
    declareParameters(((ParameterListTreeImpl) tree.parameterClause()).parameterIdentifiers());
    addFunctionBuiltInSymbols();
    addThisSymbol();

    super.visitFunctionExpression(tree);

    leaveScope();
  }

  @Override
  public void visitClass(ClassTree tree) {
    enterScope(tree);

    addThisSymbol(tree);
    super.visitClass(tree);

    leaveScope();
  }

  @Override
  public void visitFlowInterfaceDeclaration(FlowInterfaceDeclarationTree tree) {
    symbolModel.declareSymbol(tree.name().name(), Symbol.Kind.FLOW_TYPE, scriptScope)
      .addUsage(tree.name(), Usage.Kind.DECLARATION);
    super.visitFlowInterfaceDeclaration(tree);
  }

  @Override
  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    addUsages(tree);
    super.visitVariableDeclaration(tree);
  }

  @Override
  public void visitFlowTypeAliasStatement(FlowTypeAliasStatementTree tree) {
    symbolModel.declareSymbol(tree.typeAlias().name(), Symbol.Kind.FLOW_TYPE, scriptScope)
      .addUsage(tree.typeAlias(), Usage.Kind.DECLARATION);
    super.visitFlowTypeAliasStatement(tree);
  }

  private void addUsages(VariableDeclarationTree tree) {
    Scope scope = currentScope;

    if (tree.is(Kind.VAR_DECLARATION)) {
      scope = getFunctionScope();
    }

    for (BindingElementTree bindingElement : tree.variables()) {
      Symbol.Kind variableKind = getVariableKind(tree);

      if (bindingElement.is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
        for (IdentifierTree identifier :  bindingElement.bindingIdentifiers()) {
          symbolModel.declareSymbol(identifier.name(), variableKind, scope)
            .addUsage(identifier, Usage.Kind.DECLARATION_WRITE);
        }
      } else {
        for (IdentifierTree identifier : bindingElement.bindingIdentifiers()) {
          symbolModel.declareSymbol(identifier.name(), variableKind, scope)
            .addUsage(identifier, insideForLoopVariable ? Usage.Kind.DECLARATION_WRITE : Usage.Kind.DECLARATION);
        }
      }
    }
  }

  private void declareParameters(List<IdentifierTree> identifiers) {
    for (IdentifierTree identifier : identifiers) {
      symbolModel.declareSymbol(identifier.name(), Symbol.Kind.PARAMETER, currentScope)
        .addUsage(identifier, Usage.Kind.LEXICAL_DECLARATION);
    }
  }

  private Scope getFunctionScope() {
    Scope scope = currentScope;
    while (scope.isBlock()) {
      scope = scope.outer();
    }
    return scope;
  }

  private static Symbol.Kind getVariableKind(VariableDeclarationTree declaration) {
    if (declaration.is(Kind.LET_DECLARATION)) {
      return Symbol.Kind.LET_VARIABLE;

    } else if (declaration.is(Kind.CONST_DECLARATION)) {
      return Symbol.Kind.CONST_VARIABLE;

    } else {
      return Symbol.Kind.VARIABLE;
    }
  }

  private void enterScope(Tree tree) {
    currentScope = treeScopeMap.get(tree);
    if (currentScope == null) {
      throw new IllegalStateException("No scope found for the tree");
    }
  }

  private void leaveScope() {
    if (currentScope != null) {
      currentScope = currentScope.outer();
    }
  }

}
