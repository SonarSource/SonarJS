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
package org.sonar.plugins.javascript.api.symbols;

import com.google.common.annotations.Beta;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import org.sonar.javascript.tree.impl.expression.IdentifierTreeImpl;
import org.sonar.javascript.tree.symbols.Scope;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

@Beta
public class Symbol {

  public enum Kind {
    VARIABLE("variable"),
    LET_VARIABLE("block scope variable"),
    CONST_VARIABLE("read-only variable"),
    FUNCTION("function"),
    METHOD("method"),
    PARAMETER("parameter"),
    IMPORT("imported symbol"),
    CLASS("class"),
    FLOW_TYPE("flow type"),
    FLOW_GENERIC_TYPE("flow generic type")
    ;

    private final String value;

    Kind(String value) {
      this.value = value;
    }

    public String getValue() {
      return value;
    }

  }

  private final String name;
  private Kind kind;

  private boolean external;
  private Scope scope;
  private List<Usage> usages = new LinkedList<>();
  private TypeSet types;
  public Symbol(String name, Kind kind, Scope scope) {
    this.name = name;
    this.kind = kind;
    this.external = false;
    this.scope = scope;
    this.types = TypeSet.emptyTypeSet();
  }

  private void addUsage(Usage usage) {
    usages.add(usage);
    ((IdentifierTreeImpl) usage.identifierTree()).setSymbolUsage(usage);
  }

  public void addUsage(IdentifierTree identifierTree, Usage.Kind usageKind) {
    final Usage usage = new Usage(identifierTree, usageKind, this);
    addUsage(usage);
  }

  public Collection<Usage> usages() {
    return Collections.unmodifiableList(usages);
  }

  public Symbol setExternal(boolean external) {
    this.external = external;
    return this;
  }

  public Scope scope() {
    return scope;
  }

  public String name() {
    return name;
  }

  /**
   * @return true if symbol is coming from global project context and/or is created implicitly by interpreter
   * (e.g. "window" for browser environment or "arguments" for each function scope)
   */
  public boolean external() {
    return external;
  }

  public boolean is(Symbol.Kind kind) {
    return kind.equals(this.kind);
  }

  public Kind kind() {
    return kind;
  }

  public void setKind(Kind kind) {
    this.kind = kind;
  }

  public void addTypes(Set<Type> type) {
    types.addAll(type);
  }

  public void addType(Type type) {
    types.add(type);
  }

  public TypeSet types() {
    return types.immutableCopy();
  }

  /**
   * @return true if symbol created with var, let or const keywords or implicitly
   */
  public boolean isVariable() {
    return kind == Kind.LET_VARIABLE || kind == Kind.CONST_VARIABLE || kind == Kind.VARIABLE;
  }

  @Override
  public String toString() {
    return name();
  }
}
