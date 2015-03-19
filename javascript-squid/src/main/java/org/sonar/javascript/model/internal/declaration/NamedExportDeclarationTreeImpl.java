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
package org.sonar.javascript.model.internal.declaration;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.NamedExportDeclarationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.Iterator;

public class NamedExportDeclarationTreeImpl extends JavaScriptTree implements NamedExportDeclarationTree {

  private final SyntaxToken exportToken;
  private final Tree object;

  public NamedExportDeclarationTreeImpl(InternalSyntaxToken exportToken, Tree object) {
    super(Kind.NAMED_EXPORT_DECLARATION);
    this.exportToken = exportToken;
    this.object = object;

    addChildren(exportToken, (AstNode) object);
  }

  @Override
  public SyntaxToken exportToken() {
    return exportToken;
  }

  @Override
  public Tree object() {
    return object;
  }

  @Override
  public Kind getKind() {
    return Kind.NAMED_EXPORT_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.singletonIterator(object);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitNamedExportDeclaration(this);
  }
}
