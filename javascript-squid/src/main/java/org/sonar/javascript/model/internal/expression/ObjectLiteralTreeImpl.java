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
package org.sonar.javascript.model.internal.expression;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.apache.commons.collections.ListUtils;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.SeparatedList;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectLiteralTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.Iterator;

public class ObjectLiteralTreeImpl extends JavaScriptTree implements ObjectLiteralTree {

  private SyntaxToken openCurlyBrace;
  private final SeparatedList<Tree> properties;
  private SyntaxToken closeCurlyBrace;

  public ObjectLiteralTreeImpl(InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace) {
    super(Kind.OBJECT_LITERAL);
    this.openCurlyBrace = openCurlyBrace;
    this.closeCurlyBrace = closeCurlyBrace;
    this.properties = new SeparatedList<Tree>(ListUtils.EMPTY_LIST, ListUtils.EMPTY_LIST);

    addChildren(openCurlyBrace, closeCurlyBrace);
  }

  public ObjectLiteralTreeImpl(SeparatedList<Tree> properties) {
    super(Kind.OBJECT_LITERAL);
    this.properties = properties;

    for (AstNode child : properties.getChildren()) {
      addChild(child);
    }
    properties.clearChildren();
  }

  public ObjectLiteralTreeImpl complete(InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace) {
    this.openCurlyBrace = openCurlyBrace;
    this.closeCurlyBrace = closeCurlyBrace;

    prependChildren(openCurlyBrace);
    addChild(closeCurlyBrace);
    return this;
  }

  @Override
  public SyntaxToken openCurlyBrace() {
    return openCurlyBrace;
  }

  @Override
  public SeparatedList<Tree> properties() {
    return properties;
  }

  @Override
  public SyntaxToken closeCurlyBrace() {
    return closeCurlyBrace;
  }

  @Override
  public Kind getKind() {
    return Kind.OBJECT_LITERAL;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(properties.iterator());
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitObjectLiteral(this);
  }
}
