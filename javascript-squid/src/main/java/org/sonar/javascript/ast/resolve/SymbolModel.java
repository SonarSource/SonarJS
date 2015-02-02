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

import java.util.Collection;
import java.util.Map;

import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.ScriptTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Maps;
import com.google.common.collect.Multimap;

public class SymbolModel {

  private Map<Tree, Scope> scopes = Maps.newHashMap();
  private Map<Symbol, Scope> symbolScope = Maps.newHashMap();
  private Multimap<Symbol, IdentifierTree> usagesTree = HashMultimap.create();
  private Map<IdentifierTree, Symbol> refersTo = Maps.newHashMap();

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

  public Collection<IdentifierTree> getUsageFor(Symbol symbol) {
    return usagesTree.get(symbol);
  }

  public void addUsage(Symbol symbol, IdentifierTree tree) {
    usagesTree.put(symbol, tree);
    refersTo.put(tree, symbol);
  }

}
