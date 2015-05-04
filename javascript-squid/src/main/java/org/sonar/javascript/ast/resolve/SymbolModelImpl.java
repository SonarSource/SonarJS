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

import com.google.common.base.Preconditions;
import com.google.common.collect.HashMultimap;
import com.google.common.collect.Maps;
import com.google.common.collect.Multimap;
import com.google.common.collect.Sets;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.api.SymbolModel;
import org.sonar.javascript.api.SymbolModelBuilder;
import org.sonar.javascript.highlighter.SourceFileOffsets;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

import javax.annotation.Nullable;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class SymbolModelImpl implements SymbolModel, SymbolModelBuilder {

  private Map<Symbol, Scope> symbolScope = Maps.newHashMap();
  private Multimap<Symbol, Usage> usagesTree = HashMultimap.create();
  private Set<Scope> scopes = Sets.newHashSet();
  private Scope globalScope;

  public static SymbolModelImpl create(ScriptTree script, @Nullable Symbolizable symbolizable, @Nullable SourceFileOffsets sourceFileOffsets) {
    SymbolModelImpl symbolModel = new SymbolModelImpl();
    new SymbolVisitor(symbolModel, symbolizable, sourceFileOffsets).visitScript(script);
    return symbolModel;
  }

  private void setScopeForSymbol(Symbol symbol, Scope scope) {
    symbolScope.put(symbol, scope);
  }

  @Override
  public Scope globalScope() {
    return globalScope;
  }

  @Override
  public void addScope(Scope scope){
    if (scopes.isEmpty()){
      globalScope = scope;
    }
    scopes.add(scope);
  }

  @Override
  public Set<Scope> getScopes(){
    return scopes;
  }

  @Override
  public Symbol addSymbol(SymbolDeclaration declaration, Symbol.Kind kind, Scope scope) {
    Preconditions.checkArgument(declaration.tree() instanceof IdentifierTree);
    Symbol symbol = Symbol.create(((IdentifierTree) declaration.tree()).name(), declaration, kind, scope);
    setScopeForSymbol(symbol, scope);
    return symbol;
  }

  @Override
  public Symbol addBuiltInSymbol(String name, SymbolDeclaration declaration, Symbol.Kind kind, Scope scope) {
    Symbol symbol = Symbol.create(name, declaration, kind, scope).setBuiltIn(true);
    setScopeForSymbol(symbol, scope);
    return symbol;
  }

  /**
   * Returns all symbols in script
   */
  @Override
  public Set<Symbol> getSymbols() {
    return symbolScope.keySet();
  }

  /**
   *
   * @param kind kind of symbols to look for
   * @return list of symbols with the given kind
   */
  @Override
  public Set<Symbol> getSymbols(Symbol.Kind kind) {
    Set<Symbol> result = new HashSet<>();
    for (Symbol symbol : getSymbols()){
      if (kind.equals(symbol.kind())){
        result.add(symbol);
      }
    }
    return result;
  }

  /**
   *
   * @param name name of symbols to look for
   * @return list of symbols with the given name
   */
  @Override
  public Set<Symbol> getSymbols(String name) {
    Set<Symbol> result = new HashSet<>();
    for (Symbol symbol : getSymbols()){
      if (name.equals(symbol.name())){
        result.add(symbol);
      }
    }
    return result;
  }

}
