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

import org.apache.commons.lang.ArrayUtils;
import org.sonar.plugins.javascript.api.tree.Tree;

public class SymbolDeclaration {
  // tree is always IdentifierTree, except of build-in symbols, for which declaration tree stores a scope tree
  private Tree tree;
  private Kind kind;

  public enum Kind {
    VARIABLE_DECLARATION,
    FUNCTION_EXPRESSION,
    FUNCTION_DECLARATION,
    PARAMETER,
    BUILD_IN,
    CATCH_BLOCK,
    ASSIGNMENT,
    FOR_OF,
    FOR_IN
  }

  public Tree tree(){
    return tree;
  }

  public boolean is(Kind kind){
    return this.kind == kind;
  }

  public Kind kind(){
    return this.kind;
  }

  public SymbolDeclaration(Tree tree, Kind kind){
    this.tree = tree;
    this.kind = kind;
  }

  public boolean is(Kind ... kinds){
    return ArrayUtils.contains(kinds, this.kind);
  }
}
