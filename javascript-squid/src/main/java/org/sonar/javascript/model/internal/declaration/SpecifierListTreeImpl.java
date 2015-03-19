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
import org.sonar.javascript.model.internal.SeparatedList;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierListTree;
import org.sonar.plugins.javascript.api.tree.declaration.SpecifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.Iterator;
import java.util.List;

public class SpecifierListTreeImpl extends JavaScriptTree implements SpecifierListTree {

  private SyntaxToken openCurlyBraceToken;
  private final SeparatedList<SpecifierTree> specifiers;
  private SyntaxToken closeCurlyBraceToken;
  private final Kind kind;

  public SpecifierListTreeImpl(Kind kind, InternalSyntaxToken openCurlyBraceToken, InternalSyntaxToken closeCurlyBraceToken) {
    super(kind);
    this.kind = kind;
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.specifiers = null;
    this.closeCurlyBraceToken = closeCurlyBraceToken;

    addChildren(openCurlyBraceToken, closeCurlyBraceToken);
  }

  public SpecifierListTreeImpl(Kind kind, SeparatedList<SpecifierTree> specifiers, List<AstNode> children) {
    super(kind);
    this.kind = kind;
    this.specifiers = specifiers;

    for (AstNode child : children) {
      addChild(child);
    }

  }

  public SpecifierListTreeImpl complete(InternalSyntaxToken openCurlyBraceToken, InternalSyntaxToken closeCurlyBraceToken) {
    this.openCurlyBraceToken = openCurlyBraceToken;
    this.closeCurlyBraceToken = closeCurlyBraceToken;

    prependChildren(openCurlyBraceToken);
    addChild(closeCurlyBraceToken);
    return this;
  }

  @Override
  public SyntaxToken openCurlyBraceToken() {
    return openCurlyBraceToken;
  }

  @Override
  public SeparatedList<SpecifierTree> specifiers() {
    return specifiers;
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return closeCurlyBraceToken;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>concat(specifiers.iterator());
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitSpecifierList(this);
  }
}
