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

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Maps;
import com.google.common.collect.Multimap;
import org.sonar.api.source.Symbolizable;
import org.sonar.javascript.highlighter.SourceFileOffsets;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;

import javax.annotation.Nullable;
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class SymbolModel {

  private Map<Tree, Scope> scopes = Maps.newHashMap();
  private Map<Symbol, Scope> symbolScope = Maps.newHashMap();
  private Multimap<Symbol, Usage> usagesTree = HashMultimap.create();

  public static SymbolModel create(ScriptTree script, @Nullable Symbolizable symbolizable, @Nullable SourceFileOffsets sourceFileOffsets) {
    SymbolModel symbolModel = new SymbolModel();
    new SymbolVisitor(symbolModel, symbolizable, sourceFileOffsets).visitScript(script);
    return symbolModel;
  }

  public void setScopeFor(Tree tree, Scope scope) {
    scopes.put(tree, scope);
  }

  public Scope getScopeFor(Tree tree) {
    return scopes.get(tree);
  }

  public void setScopeForSymbol(Symbol symbol, Scope scope) {
    symbolScope.put(symbol, scope);
  }

  public Collection<Usage> getUsagesFor(Symbol symbol) {
    return usagesTree.get(symbol);
  }

  public void addUsage(Symbol symbol, Usage usage) {
    usagesTree.put(symbol, usage);
  }

  /**
   * Returns all symbols in script
   */
  public Set<Symbol> getSymbols() {
    return symbolScope.keySet();
  }

  /**
   *
   * @param kind kind of symbols to look for
   * @return list of symbols with the given kind
   */
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
  public Set<Symbol> getSymbols(String name) {
    Set<Symbol> result = new HashSet<>();
    for (Symbol symbol : getSymbols()){
      if (name.equals(symbol.name())){
        result.add(symbol);
      }
    }
    return result;
  }

  public Collection<Scope> getScopes(){
    Collection<Scope> duplicatedScopes = symbolScope.values();
    Set<Scope> uniqueScopes = new HashSet<>();
    for (Scope scope : duplicatedScopes){
      uniqueScopes.add(scope);
    }
    return uniqueScopes;
  }

}
