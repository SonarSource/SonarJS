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
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.Multimap;
import org.apache.commons.lang.ArrayUtils;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;

import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class SymbolModel {

  private Map<Tree, Scope> scopes = Maps.newHashMap();
  private Map<Symbol, Scope> symbolScope = Maps.newHashMap();
  private Multimap<Symbol, Usage> usagesTree = HashMultimap.create();
  private Map<Usage, Symbol> refersTo = Maps.newHashMap();

  public static SymbolModel createFor(ScriptTree script) {
    SymbolModel symbolModel = new SymbolModel();

    new SymbolVisitor(symbolModel).visitScript(script);

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

  public Collection<Usage> getUsageFor(Symbol symbol) {
    return usagesTree.get(symbol);
  }

  public void addUsage(Symbol symbol, Usage usage) {
    usagesTree.put(symbol, usage);
    refersTo.put(usage, symbol);
  }

  /**
   *
   * @param kinds kinds of symbols to look for
   * @return list of symbols with the given kind or all symbols if no kinds provided
   */
  public List<Symbol> getSymbols(Symbol.Kind ... kinds) {
    Set<Symbol> symbols = symbolScope.keySet();
    if (kinds.length == 0){
      return Lists.newArrayList(symbols);
    }
    List<Symbol> result = new LinkedList<>();
    for (Symbol symbol : symbols){
      if (ArrayUtils.contains(kinds, symbol.kind())){
        result.add(symbol);
      }
    }
    return result;
  }

  /**
   *
   * @param names names of symbols to look for
   * @return list of symbols with the given names or all symbols if empty list of name provided
   */
  public List<Symbol> getSymbols(List<String> names) {
    Set<Symbol> symbols = symbolScope.keySet();
    if (names.isEmpty()){
      return Lists.newArrayList(symbols);
    }
    List<Symbol> result = new LinkedList<>();
    for (Symbol symbol : symbols){
      if (names.contains(symbol.name())){
        result.add(symbol);
      }
    }
    return result;
  }

  /**
   *
   * @param name name of symbols to look for
   * @return list of symbols with the given names or all symbols if empty list of name provided
   */
  public List<Symbol> getSymbols(String name) {
    return getSymbols(ImmutableList.of(name));
  }


}
