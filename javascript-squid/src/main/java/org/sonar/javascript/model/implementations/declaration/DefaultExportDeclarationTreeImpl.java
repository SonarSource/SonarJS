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

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.DefaultExportDeclarationTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;
import java.util.Iterator;

public class DefaultExportDeclarationTreeImpl extends JavaScriptTree implements DefaultExportDeclarationTree {

  private final SyntaxToken exportToken;
  private final SyntaxToken defaultToken;
  private final Tree object;

  public DefaultExportDeclarationTreeImpl(InternalSyntaxToken exportToken, InternalSyntaxToken defaultToken, Tree object) {
    super(Kind.DEFAULT_EXPORT_DECLARATION);
    this.exportToken = exportToken;
    this.defaultToken = defaultToken;
    this.object = object;

    addChildren(exportToken, defaultToken, (AstNode) object);
  }

  @Override
  public SyntaxToken exportToken() {
    return exportToken;
  }

  @Override
  public SyntaxToken defaultToken() {
    return defaultToken;
  }

  @Override
  public Tree object() {
    return object;
  }

  @Nullable
  @Override
  public Tree eos() {
    throw new UnsupportedOperationException("Not supported yet in the strongly typed AST.");
  }

  @Override
  public Kind getKind() {
    return Kind.DEFAULT_EXPORT_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.singletonIterator(object);
  }

}
