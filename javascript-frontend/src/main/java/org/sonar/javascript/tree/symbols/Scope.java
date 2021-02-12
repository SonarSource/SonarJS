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

import com.google.common.collect.Maps;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;

public class Scope {

  private Scope outer;
  private final Tree tree;
  protected Map<String, Symbol> symbols = Maps.newHashMap();
  private final boolean isBlock;

  /**
   *
   * @param outer parent scope
   * @param tree syntax tree holding this scope (e.g. ScriptTree or BlockTree)
   * @param isBlock pass true for block scopes (loops, if, etc.), false for function scopes (script, functions, getter, etc.)
   */
  public Scope(Scope outer, Tree tree, boolean isBlock) {
    this.outer = outer;
    this.tree = tree;
    this.isBlock = isBlock;
  }

  public Tree tree() {
    return tree;
  }

  public Scope outer() {
    return outer;
  }

  /**
   * @param name of the symbol to look for
   * @return the symbol corresponding to the given name
   */
  public Symbol lookupSymbol(String name) {
    Scope scope = this;
    while (scope != null && !scope.symbols.containsKey(name)) {
      scope = scope.outer;
    }
    return scope == null ? null : scope.symbols.get(name);
  }

  /**
   * @param kind of the symbols to look for
   * @return the symbols corresponding to the given kind
   */
  public List<Symbol> getSymbols(Symbol.Kind kind) {
    List<Symbol> result = new LinkedList<>();
    for (Symbol symbol : symbols.values()) {
      if (symbol.is(kind)) {
        result.add(symbol);
      }
    }
    return result;
  }

  public boolean isGlobal() {
    return tree.is(Tree.Kind.SCRIPT);
  }

  public void addSymbol(Symbol symbol) {
    symbols.put(symbol.name(), symbol);
  }

  @Nullable
  public Symbol getSymbol(String name) {
    return symbols.get(name);
  }

  /**
   * Returns true for block scopes (loops, if, etc.), false for function scopes (script, functions, getter, etc.)
   */
  public boolean isBlock() {
    return isBlock;
  }
}
