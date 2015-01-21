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
package org.sonar.javascript.model.implementations.declaration;

import java.util.Iterator;
import java.util.List;

import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.expression.LiteralTreeImpl;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.ModuleTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.DeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.FromClauseTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import com.google.common.collect.Iterators;

public class ModuleTreeImpl extends JavaScriptTree implements ModuleTree {

  private final List<Tree> items;

  // FIXME: get rid of AstNode
  public ModuleTreeImpl(List<AstNode> items) {
    super(Kind.MODULE);

    this.items = null;

    for (AstNode item : items) {
      addChild(item);
    }
  }

  @Override
  public List<Tree> items() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Kind getKind() {
    return Kind.MODULE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }

}
