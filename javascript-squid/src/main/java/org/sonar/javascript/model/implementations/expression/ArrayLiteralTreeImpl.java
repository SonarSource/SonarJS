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
package org.sonar.javascript.model.implementations.expression;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ArrayLiteralTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;
import java.util.List;

public class ArrayLiteralTreeImpl extends JavaScriptTree implements ArrayLiteralTree {

  private SyntaxToken openBracket;
  // FIXME remove usage of AstNode
  private final SeparatedList<AstNode> elements;
  private SyntaxToken closeBracket;

  public ArrayLiteralTreeImpl(InternalSyntaxToken openBracket, InternalSyntaxToken closeBracket) {
    super(Kind.ARRAY_LITERAL);
    this.openBracket = openBracket;
    this.elements = new SeparatedList<AstNode>(ListUtils.EMPTY_LIST, ListUtils.EMPTY_LIST);
    this.closeBracket = closeBracket;

    addChildren(openBracket, closeBracket);
  }

  public ArrayLiteralTreeImpl(List<AstNode> elements, List<InternalSyntaxToken> commas, List<AstNode> children) {
    super(Kind.ARRAY_LITERAL);
    this.elements = new SeparatedList<AstNode>(elements, commas);

    for (AstNode child : children) {
      addChild(child);
    }
  }

  public ArrayLiteralTreeImpl complete(InternalSyntaxToken openBracket, InternalSyntaxToken closeBracket) {
    this.openBracket = openBracket;
    this.closeBracket = closeBracket;

    prependChildren(openBracket);
    addChild(closeBracket);
    return this;
  }

  @Override
  public SyntaxToken openBracket() {
    return openBracket;
  }

  @Override
  public SeparatedList<AstNode> elements() {
    return elements;
  }

  @Override
  public SyntaxToken closeBracket() {
    return closeBracket;
  }

  @Override
  public Kind getKind() {
    return Kind.ARRAY_LITERAL;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }

}
