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
package org.sonar.javascript.se;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.SetMultimap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.javascript.cfg.CfgBlock;
import org.sonar.javascript.cfg.ControlFlowGraph;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

/**
 * Variables which are defined in the scope of a function and may be evaluated through symbolic execution.
 */
public class LocalVariables {

  private final Scope functionScope;
  private final Set<Symbol> trackableVariables = new HashSet<>();
  private final Set<Symbol> functionParameters = new HashSet<>();

  // Map has symbols from outer scopes as keys. If symbol stands for function declaration, then map contains value for this tree.
  private final Map<Symbol, SymbolicValue> symbolsFromOuterScope = new HashMap<>();

  public LocalVariables(Scope functionScope, ControlFlowGraph cfg) {
    this.functionScope = functionScope;
    SetMultimap<Symbol, IdentifierTree> localVarIdentifiersInCfg = HashMultimap.create();

    for (CfgBlock block : cfg.blocks()) {
      for (Tree element : block.elements()) {
        if (element instanceof IdentifierTree) {
          add((IdentifierTree) element, localVarIdentifiersInCfg);
        }
      }
    }

    for (Symbol localVar : localVarIdentifiersInCfg.keySet()) {
      if (!isWrittenOutsideCfg(localVar, localVarIdentifiersInCfg)) {
        trackableVariables.add(localVar);
      }
      if (localVar.is(Symbol.Kind.PARAMETER)) {
        functionParameters.add(localVar);
      }
    }

    findSymbolsFromOuterScopeToTrack(functionScope);
  }

  private void findSymbolsFromOuterScopeToTrack(Scope scope) {
    Scope outerScope = scope.outer();

    List<Symbol> symbols = outerScope.getSymbols(Kind.VARIABLE);
    symbols.addAll(outerScope.getSymbols(Kind.FUNCTION));

    for (Symbol symbol : symbols) {
      checkSymbolFromOuterScope(symbol);
    }

    if (!outerScope.isGlobal()) {
      findSymbolsFromOuterScopeToTrack(outerScope);
    }
  }

  private void checkSymbolFromOuterScope(Symbol symbol) {
    IdentifierTree declarationWriteUsage = null;
    boolean otherWriteUsage = false;

    for (Usage usage : symbol.usages()) {
      if (usage.kind().equals(Usage.Kind.DECLARATION_WRITE) || (symbol.is(Kind.FUNCTION) && usage.kind().equals(Usage.Kind.DECLARATION))) {
        declarationWriteUsage = usage.identifierTree();
      } else if (usage.isWrite()) {
        otherWriteUsage = true;
      }
    }

    if (declarationWriteUsage != null && !otherWriteUsage) {
      Tree parent = ((JavaScriptTree) declarationWriteUsage).getParent();
      if (parent.is(Tree.Kind.FUNCTION_DECLARATION, Tree.Kind.GENERATOR_DECLARATION)) {
        symbolsFromOuterScope.put(symbol, new SymbolicValueWithConstraint(Constraint.FUNCTION));

      } else if (parent.is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
        ExpressionStack expressionStack = ExpressionStack.emptyStack();
        try {
          expressionStack = expressionStack.execute(((InitializedBindingElementTree) parent).right());
          symbolsFromOuterScope.put(symbol, expressionStack.peek());
        } catch (Exception e) {
          symbolsFromOuterScope.put(symbol, null);
        }

      } else {
        symbolsFromOuterScope.put(symbol, null);
      }
    }
  }

  /**
   * Local variables which value may be tracked through symbolic execution of the function body.
   */
  public Set<Symbol> trackableVariables() {
    return trackableVariables;
  }

  public Map<Symbol, SymbolicValue> symbolsFromOuterScope() {
    return symbolsFromOuterScope;
  }

  /**
   * Subset of {@link LocalVariables#trackableVariables()} containing variables which are parameters.
   */
  public Set<Symbol> functionParameters() {
    return functionParameters;
  }

  private static boolean isWrittenOutsideCfg(Symbol localVar, SetMultimap<Symbol, IdentifierTree> localVarIdentifiersInCfg) {
    for (Usage usage : localVar.usages()) {
      if (usage.isWrite() && !localVarIdentifiersInCfg.get(localVar).contains(usage.identifierTree())) {
        return true;
      }
    }
    return false;
  }

  private void add(IdentifierTree identifier, SetMultimap<Symbol, IdentifierTree> localVarIdentifiersInCfg) {
    Symbol symbol = identifier.symbol();
    if (symbol != null && isLocalVariable(symbol)) {
      localVarIdentifiersInCfg.put(identifier.symbol(), identifier);
    }
  }

  private boolean isLocalVariable(Symbol symbol) {
    Scope scope = symbol.scope();
    while (!scope.isGlobal()) {
      if (scope.equals(functionScope)) {
        return true;
      }
      scope = scope.outer();
    }
    return false;
  }
}
