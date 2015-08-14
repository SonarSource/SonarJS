/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
package org.sonar.plugins.javascript.api.symbols;

import com.google.common.annotations.Beta;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.javascript.tree.impl.expression.IdentifierTreeImpl;

import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

@Beta
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
  private Kind kind;
  private boolean builtIn;
  private Scope scope;
  private List<Usage> usages = new LinkedList<>();
  private TypeSet types;

  public Symbol(String name, Kind kind, Scope scope) {
    this.name = name;
    this.kind = kind;
    this.builtIn = false;
    this.scope = scope;
    this.types = TypeSet.emptyTypeSet();
  }

  public void addUsage(Usage usage){
    usages.add(usage);
    ((IdentifierTreeImpl)usage.identifierTree()).setSymbol(this);
  }

  public Collection<Usage> usages(){
    return usages;
  }

  public Symbol setBuiltIn(boolean isBuiltIn){
    this.builtIn = isBuiltIn;
    return this;
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

  public void addTypes(Set<Type> type){
    types.addAll(type);
  }

  public void addType(Type type){
    types.add(type);
  }

  public TypeSet types(){
    return types.immutableCopy();
  }

}
