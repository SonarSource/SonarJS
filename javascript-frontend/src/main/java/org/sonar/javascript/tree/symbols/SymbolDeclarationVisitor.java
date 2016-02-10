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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.sonar.javascript.tree.impl.declaration.InitializedBindingElementTreeImpl;
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
import org.sonar.plugins.javascript.api.tree.declaration.FunctionDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.GeneratorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.ClassTree;
import org.sonar.plugins.javascript.api.tree.expression.FunctionExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.tree.statement.CatchBlockTree;
import org.sonar.plugins.javascript.api.tree.statement.ForInStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForOfStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.ForStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.SwitchStatementTree;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

/**
 * This visitor records all symbol explicitly declared through a declared statement.
 * i.e: Method Declaration,
 */
public class SymbolDeclarationVisitor extends DoubleDispatchVisitor {

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

    addGlobalBuiltInSymbols();
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
  public void visitForInStatement(ForInStatementTree tree) {
    newBlockScope(tree);

    skipBlock(tree.statement());
    super.visitForInStatement(tree);

    leaveScope();
  }

  @Override
  public void visitForOfStatement(ForOfStatementTree tree) {
    newBlockScope(tree);

    skipBlock(tree.statement());
    super.visitForOfStatement(tree);

    leaveScope();
  }


  @Override
  public void visitSwitchStatement(SwitchStatementTree tree) {
    scan(tree.expression());

    newBlockScope(tree);
    scan(tree.cases());
    leaveScope();
  }

  private void addGlobalBuiltInSymbols() {
    symbolModel.declareBuiltInSymbol("eval", Symbol.Kind.FUNCTION, currentScope);

    Symbol symbol = symbolModel.declareBuiltInSymbol("window", Symbol.Kind.VARIABLE, currentScope);
    symbol.addType(ObjectType.WebApiType.WINDOW);
  }

  @Override
  public void visitMethodDeclaration(MethodDeclarationTree tree) {
    visitMethod(tree);
  }

  @Override
  public void visitAccessorMethodDeclaration(AccessorMethodDeclarationTree tree) {
    visitMethod(tree);
  }

  @Override
  public void visitGeneratorMethodDeclaration(GeneratorMethodDeclarationTree tree) {
    visitMethod(tree);
  }

  private void visitMethod(MethodDeclarationTree tree) {
    newFunctionScope(tree);

    declareParameters(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers());
    addFunctionBuiltInSymbols();

    skipBlock(tree.body());

    super.visitMethodDeclaration(tree);

    leaveScope();
  }

  private void addFunctionBuiltInSymbols() {
    String arguments = "arguments";
    if (currentScope.symbols.get(arguments) == null) {
      symbolModel.declareBuiltInSymbol(arguments, Symbol.Kind.VARIABLE, currentScope);
    }
  }

  @Override
  public void visitCatchBlock(CatchBlockTree tree) {
    newBlockScope(tree);

    for (IdentifierTree identifier : ((CatchBlockTreeImpl) tree).parameterIdentifiers()) {
      symbolModel.declareSymbol(identifier.name(), Symbol.Kind.VARIABLE, currentScope)
        .addUsage(Usage.create(identifier, Usage.Kind.DECLARATION));
    }

    skipBlock(tree.block());
    super.visitCatchBlock(tree);

    leaveScope();
  }

  @Override
  public void visitFunctionDeclaration(FunctionDeclarationTree tree) {
    symbolModel.declareSymbol(tree.name().name(), Symbol.Kind.FUNCTION, currentScope)
      .addUsage(Usage.create(tree.name(), Usage.Kind.DECLARATION));

    newFunctionScope(tree);

    declareParameters(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers());
    addFunctionBuiltInSymbols();

    skipBlock(tree.body());
    super.visitFunctionDeclaration(tree);

    leaveScope();
  }

  @Override
  public void visitArrowFunction(ArrowFunctionTree tree) {
    newFunctionScope(tree);

    declareParameters(((ArrowFunctionTreeImpl) tree).parameterIdentifiers());
    addFunctionBuiltInSymbols();

    skipBlock(tree.conciseBody());
    super.visitArrowFunction(tree);

    leaveScope();
  }

  @Override
  public void visitFunctionExpression(FunctionExpressionTree tree) {
    newFunctionScope(tree);

    IdentifierTree name = tree.name();
    if (name != null) {
      // Not available in enclosing scope
      symbolModel.declareSymbol(name.name(), Symbol.Kind.FUNCTION, currentScope).addUsage(Usage.create(name, Usage.Kind.DECLARATION));

    }
    declareParameters(((ParameterListTreeImpl) tree.parameters()).parameterIdentifiers());
    addFunctionBuiltInSymbols();

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
  public void visitVariableDeclaration(VariableDeclarationTree tree) {
    addUsages(tree);
    super.visitVariableDeclaration(tree);
  }

  private void addUsages(VariableDeclarationTree tree) {
    Scope scope = currentScope;

    if (tree.is(Kind.VAR_DECLARATION)) {
      scope = getFunctionScope();
    }

    // todo Consider other BindingElementTree types
    for (BindingElementTree bindingElement : tree.variables()) {
      Symbol.Kind variableKind = getVariableKind(tree);

      if (bindingElement.is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
        for (IdentifierTree identifier : ((InitializedBindingElementTreeImpl) bindingElement).bindingIdentifiers()) {
          symbolModel.declareSymbol(identifier.name(), variableKind, scope)
            .addUsage(Usage.create(identifier, Usage.Kind.DECLARATION_WRITE));
        }
      }
      if (bindingElement instanceof IdentifierTree) {
        IdentifierTree identifierTree = (IdentifierTree) bindingElement;
        symbolModel.declareSymbol(identifierTree.name(), variableKind, scope)
          .addUsage(Usage.create(identifierTree, Usage.Kind.DECLARATION));
      }
    }
  }

  private void leaveScope() {
    if (currentScope != null) {
      currentScope = currentScope.outer();
    }
  }

  private void declareParameters(List<IdentifierTree> identifiers) {
    for (IdentifierTree identifier : identifiers) {
      symbolModel.declareSymbol(identifier.name(), Symbol.Kind.PARAMETER, currentScope)
        .addUsage(Usage.create(identifier, Usage.Kind.LEXICAL_DECLARATION));
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

  private Scope getFunctionScope() {
    Scope scope = currentScope;
    while (scope.isBlock()) {
      scope = scope.outer();
    }
    return scope;
  }

  private Symbol.Kind getVariableKind(VariableDeclarationTree declaration) {
    if (declaration.is(Kind.LET_DECLARATION)) {
      return Symbol.Kind.LET_VARIABLE;

    } else if (declaration.is(Kind.CONST_DECLARATION)) {
      return Symbol.Kind.CONST_VARIABLE;

    } else {
      return Symbol.Kind.VARIABLE;
    }
  }
}
