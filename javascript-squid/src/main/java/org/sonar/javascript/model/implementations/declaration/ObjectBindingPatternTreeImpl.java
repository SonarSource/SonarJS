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
import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.DeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ObjectBindingPatternTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;

public class ObjectBindingPatternTreeImpl extends JavaScriptTree implements ObjectBindingPatternTree {

  private SyntaxToken openCurlyBrace;
  private SeparatedList<Tree> bindingElements;
  private SyntaxToken closeCurlyBrace;

  public ObjectBindingPatternTreeImpl(SeparatedList<Tree> bindingElements) {
    super(Kind.OBJECT_BINDING_PATTERN);
    this.bindingElements = bindingElements;

    for (AstNode child: bindingElements.getChildren()) {
      addChild(child);
    }
    bindingElements.clearChildren();
  }

  public ObjectBindingPatternTreeImpl(InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace) {
    super(Kind.OBJECT_BINDING_PATTERN);
    this.openCurlyBrace = openCurlyBrace;
    this.bindingElements = new SeparatedList<Tree>(ListUtils.EMPTY_LIST, ListUtils.EMPTY_LIST);
    this.closeCurlyBrace = closeCurlyBrace;

    addChildren(openCurlyBrace, closeCurlyBrace);
  }

  public ObjectBindingPatternTreeImpl complete(InternalSyntaxToken openCurlyBrace, InternalSyntaxToken closeCurlyBrace) {
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
  public SeparatedList<Tree> elements() {
    return bindingElements;
  }

  @Override
  public SyntaxToken closeCurlyBrace() {
    return closeCurlyBrace;
  }

  @Override
  public Kind getKind() {
    return Kind.OBJECT_BINDING_PATTERN;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(bindingElements.iterator());
  }

}
