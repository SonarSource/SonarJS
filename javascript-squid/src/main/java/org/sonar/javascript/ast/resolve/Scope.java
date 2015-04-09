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

import com.google.common.collect.Maps;
import org.sonar.javascript.model.interfaces.Tree;

import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public class Scope {

  private Scope outer;
  private final Tree tree;
  protected Map<String, Symbol> symbols = Maps.newHashMap();
  // FIXME martin: shouldn't it be named inner ? How is it useful ?
  private Scope next;

  public Scope(Scope outer, Tree tree) {
    this.outer = outer;
    this.tree = tree;
  }

  public Tree getTree() {
    return tree;
  }

  public Scope outer() {
    return outer;
  }

  public Scope next() {
    return next;
  }

  public void setNext(Scope next) {
    this.next = next;
  }

  /**
   * Create new symbol for the current scope, or update the symbol list of declarations
   * if a symbol with the given named has already been declared in the scope.
   *
   * @return the symbol
   */
  public Symbol createSymbol(String name, Tree declaration, Symbol.Kind kind) {
    Symbol symbol = symbols.get(name);

    if (symbol != null) {
      symbol.declarations().add(declaration);

    } else {
      symbol = new Symbol(name, declaration, kind);
      symbols.put(name, symbol);
    }

    return symbol;
  }

  /**
   * Create new build-in symbol for the current scope
   *
   * @return the symbol
   */
  public Symbol createBuildInSymbol(String name, Symbol.Kind kind) {
    Symbol symbol = symbols.get(name);

    if (symbol != null) {
      throw new IllegalStateException(String.format("Build-in \"symbol\" %s already exists in the current scope.", name));
    } else {
      symbol = new Symbol(name, this.getTree(), kind, true);
      symbols.put(name, symbol);
    }

    return symbol;
  }



  /**
   * @param name of the symbol to look for
   *
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
   *
   * @return the symbols corresponding to the given kind
   */
  public List<Symbol> getSymbols(Symbol.Kind kind) {
    List<Symbol> result = new LinkedList<>();
    for (Symbol symbol : symbols.values()){
      if (symbol.is(kind)){
        result.add(symbol);
      }
    }
    return result;
  }

  /**
   * @return the global scope of the script.
   */
  public Scope globalScope() {
    Scope scope = this;

    while (scope.outer != null) {
      scope = scope.outer;
    }

    return scope;
  }

  @Override
  public String toString() {
    return "Scope{" + "tree=" + tree + ", symbols=" + symbols.size() + '}';
  }
}
