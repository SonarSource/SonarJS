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

import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

public class Usage {

  public enum Kind {
    DECLARATION,
    DECLARATION_WRITE,
    LEXICAL_DECLARATION,  // parameters in function signature
    WRITE,
    READ,
    READ_WRITE;
  }
  private Kind kind;
  private IdentifierTree symbolTree;
  private Tree usageTree;

  /**
   *
   * @param symbolTree - this tree contains only symbol name identifier (we need it for symbol highlighting)
   * @param kind - kind of usage
   */
  private Usage(IdentifierTree symbolTree, Kind kind){
    this.kind = kind;
    this.symbolTree = symbolTree;
    this.usageTree = symbolTree;
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

  public Usage setUsageTree(Tree usageTree){
    this.usageTree = usageTree;
    return this;
  }

  public static Usage create(IdentifierTree symbolTree, Kind kind){
    return new Usage(symbolTree, kind);
  }

  public boolean isDeclaration(){
    return kind == Kind.DECLARATION_WRITE || kind == Kind.DECLARATION;
  }

  public boolean isWrite() {
    return kind == Kind.DECLARATION_WRITE || kind == Kind.WRITE || kind == Kind.READ_WRITE;
  }
}
