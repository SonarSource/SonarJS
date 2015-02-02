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
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.FromClauseTree;
import org.sonar.javascript.model.interfaces.declaration.NameSpaceExportDeclarationTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;

public class NameSpaceExportDeclarationTreeImpl extends JavaScriptTree implements NameSpaceExportDeclarationTree {

  private final SyntaxToken exportToken;
  private final SyntaxToken starToken;
  private final FromClauseTree fromClause;

  public NameSpaceExportDeclarationTreeImpl(InternalSyntaxToken exportToken, InternalSyntaxToken starToken, FromClauseTreeImpl fromClause, AstNode eos) {
    super(Kind.NAMESPACE_EXPORT_DECLARATION);
    this.exportToken = exportToken;
    this.starToken = starToken;
    this.fromClause = fromClause;

    addChildren(exportToken, starToken, fromClause, eos);
  }

  @Override
  public SyntaxToken exportToken() {
    return exportToken;
  }

  @Override
  public SyntaxToken starToken() {
    return starToken;
  }

  @Override
  public FromClauseTree fromClause() {
    return fromClause;
  }

  @Override
  public Kind getKind() {
    return Kind.NAMESPACE_EXPORT_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(fromClause);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitNameSpaceExportDeclaration(this);
  }
}
