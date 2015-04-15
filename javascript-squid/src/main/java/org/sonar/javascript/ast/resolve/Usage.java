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

import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;

import javax.annotation.Nullable;

public class Usage {

  public enum Kind {
    WRITE,
    READ,
    READ_WRITE
  }
  private Kind kind;
  private IdentifierTree symbolTree;
  private Tree usageTree;
  private boolean init = false;

  private Usage(IdentifierTree symbolTree, @Nullable Tree usageTree, Kind kind){
    this.kind = kind;
    this.symbolTree = symbolTree;
    this.usageTree = usageTree != null ? usageTree : symbolTree;
  }

  public Kind kind() {
    return kind;
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

  public static Usage create(SymbolModel symbolModel, Symbol symbol, IdentifierTree symbolTree, Tree usageTree, Kind kind){
    Usage usage = new Usage(symbolTree, usageTree, kind);
    symbolModel.addUsage(symbol, usage);
    return usage;
  }

  public static Usage create(SymbolModel symbolModel, Symbol symbol, IdentifierTree symbolTree, Kind kind){
    Usage usage = new Usage(symbolTree, null, kind);
    symbolModel.addUsage(symbol, usage);
    return usage;
  }

  public static Usage createInit(SymbolModel symbolModel, Symbol symbol, IdentifierTree symbolTree, Tree usageTree, Kind kind){
    Usage usage = create(symbolModel, symbol, symbolTree, usageTree, kind);
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
