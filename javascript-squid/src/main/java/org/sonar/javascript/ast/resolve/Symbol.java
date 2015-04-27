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

import com.google.common.collect.Lists;

import java.util.List;

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
  private boolean buildIn;
  private Scope scope;

  private Symbol(String name, SymbolDeclaration declaration, Kind kind, Scope scope, boolean buildIn) {
    this.name = name;
    this.kind = kind;
    this.declarations.add(declaration);
    this.buildIn = buildIn;
    this.scope = scope;
  }

  public static Symbol createBuildIn(String name, SymbolDeclaration declaration, Kind kind, Scope scope){
    return new Symbol(name, declaration, kind, scope, true);
  }

  public static Symbol create(String name, SymbolDeclaration declaration, Kind kind, Scope scope){
    return new Symbol(name, declaration, kind, scope, false);
  }

  public Scope scope() {
    return scope;
  }

  public String name() {
    return name;
  }

  public boolean buildIn() {
    return buildIn;
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

}
