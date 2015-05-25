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
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

import org.sonar.javascript.model.internal.expression.IdentifierTreeImpl;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

public class Symbol {

  public enum Kind {
    VARIABLE("variable"),
    FUNCTION("function"),
    PARAMETER("parameter"),
    CLASS("class");

    Kind(String value) {
      this.value = value;
    }

    private final String value;
    public String getValue() {
      return value;
    }
  }

  private final String name;
  private List<SymbolDeclaration> declarations = Lists.newArrayList();
  private Kind kind;
  private boolean builtIn;
  private Scope scope;
  private List<Usage> usages = new LinkedList<>();
  private Set<Type> types;

  private Symbol(String name, SymbolDeclaration declaration, Kind kind, Scope scope) {
    this.name = name;
    this.kind = kind;
    this.addDeclaration(declaration);
    this.builtIn = false;
    this.scope = scope;
    this.types = Sets.newHashSet();
  }

  public void addUsage(Usage usage){
    usages.add(usage);
    ((IdentifierTreeImpl)usage.symbolTree()).setSymbol(this);
  }

  public Collection<Usage> usages(){
    return usages;
  }

  public Symbol setBuiltIn(boolean isBuiltIn){
    this.builtIn = isBuiltIn;
    return this;
  }

  public static Symbol create(String name, SymbolDeclaration declaration, Kind kind, Scope scope){
    Symbol symbol = scope.getSymbol(name);
    if (symbol == null) {
      symbol = new Symbol(name, declaration, kind, scope);
      scope.addSymbol(symbol);
    } else {
      symbol.addDeclaration(declaration);
    }
    return symbol;
  }

  private void addDeclaration(SymbolDeclaration declaration) {
    this.declarations.add(declaration);
    if (declaration.tree() instanceof IdentifierTree){
      ((IdentifierTreeImpl)declaration.tree()).setSymbol(this);
    }
  }

  public Scope scope() {
    return scope;
  }

  public String name() {
    return name;
  }

  public boolean builtIn() {
    return builtIn;
  }

  public boolean is(Symbol.Kind kind) {
    return kind.equals(this.kind);
  }

  public Kind kind() {
    return kind;
  }

  public List<SymbolDeclaration> declarations() {
    return declarations;
  }

  public SymbolDeclaration declaration() {
    return declarations.get(0);
  }

  public void addType(Type type){
    types.add(type);
  }

  public Set<Type> getTypes(){
    return types;
  }
}
