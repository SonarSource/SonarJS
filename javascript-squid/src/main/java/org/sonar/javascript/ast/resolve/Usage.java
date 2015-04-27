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

import org.sonar.javascript.api.SymbolModelBuilder;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

import javax.annotation.Nullable;

public class Usage {

  public enum Type {
    HTMLElement
  }

  public enum Kind {
    WRITE,
    READ,
    READ_WRITE;
  }
  private Kind kind;
  private IdentifierTree symbolTree;
  private Tree usageTree;
  private boolean init = false;
  private Scope scope;
  private Type type;

  /**
   *
   * @param symbolTree - this tree contains only symbol name identifier (we need it for symbol highlighting)
   * @param usageTree - this tree may contain any tree with symbol identifier subtree (e.g. assignment expression).
   *                  Could be null, in this case this.usageTree will be equal symbolTree
   * @param kind - kind of usage
   * @param scope - scope in which this usage appears
   */
  private Usage(IdentifierTree symbolTree, @Nullable Tree usageTree, Kind kind, Scope scope){
    this.kind = kind;
    this.symbolTree = symbolTree;
    this.usageTree = usageTree != null ? usageTree : symbolTree;
    this.scope = scope;
    this.type = null;
  }

  private Usage(IdentifierTree symbolTree, @Nullable Tree usageTree, Kind kind, Scope scope, @Nullable Type type){
    this.kind = kind;
    this.symbolTree = symbolTree;
    this.usageTree = usageTree != null ? usageTree : symbolTree;
    this.scope = scope;
    this.type = type;
  }

  public Kind kind() {
    return kind;
  }

  public Scope scope() {
    return scope;
  }

  @Nullable
  public Type type() {
    return type;
  }

  public IdentifierTree symbolTree() {
    return symbolTree;
  }

  public Tree usageTree() {
    return usageTree;
  }

  public boolean isInit() {
    return  init;
  }

  public static Usage create(SymbolModelBuilder symbolModel, Symbol symbol, IdentifierTree symbolTree, Tree usageTree, Kind kind, Scope scope){
    Usage usage = new Usage(symbolTree, usageTree, kind, scope);
    symbolModel.addUsage(symbol, usage);
    return usage;
  }

  public static Usage create(SymbolModelBuilder symbolModel, Symbol symbol, IdentifierTree symbolTree, Tree usageTree, Kind kind, Scope scope, Type type){
    Usage usage = new Usage(symbolTree, usageTree, kind, scope, type);
    symbolModel.addUsage(symbol, usage);
    return usage;
  }

  public static Usage create(SymbolModelBuilder symbolModel, Symbol symbol, IdentifierTree symbolTree, Kind kind, Scope scope){
    Usage usage = new Usage(symbolTree, null, kind, scope);
    symbolModel.addUsage(symbol, usage);
    return usage;
  }

  public static Usage createInit(SymbolModelBuilder symbolModel, Symbol symbol, IdentifierTree symbolTree, Tree usageTree, Kind kind, Scope scope){
    Usage usage = create(symbolModel, symbol, symbolTree, usageTree, kind, scope);
    usage.init = true;
    return usage;
  }

  @Override
  public String toString() {
    return "Usage{" +
      "kind=" + kind +
      ", symbolTree=" + symbolTree +
      ", init=" + init +
      '}';
  }
}
