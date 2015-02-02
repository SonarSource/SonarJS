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
import com.google.common.collect.Lists;
import com.sonar.sslr.api.AstNode;
import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.BindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.BindingPropertyTree;
import org.sonar.javascript.model.interfaces.declaration.InitializedBindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.ObjectBindingPatternTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;
import java.util.List;

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

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitObjectBindingPattern(this);
  }

  /**
   * Return the list of new binding names introduced by this object binding pattern.
   * <p>
   * Example:
   * <pre>
   *   { f:first, l:last, siblings:{ a, b c} } // will return [first, last, a, b, c]
   * </pre>
   */
  public List<IdentifierTree> bindingIdentifiers() {
    List<IdentifierTree> bindingIdentifiers = Lists.newArrayList();

    for (Tree element : bindingElements) {

      if (element.is(Kind.BINDING_PROPERTY)) {
        bindingIdentifiers.addAll(identifierFromBindingElement(((BindingPropertyTree) element).value()));

      } else if (element.is(Kind.INITIALIZED_BINDING_ELEMENT)) {
        bindingIdentifiers.addAll(identifierFromBindingElement(((InitializedBindingElementTree) element).left()));

      } else {
        bindingIdentifiers.addAll(identifierFromBindingElement((BindingElementTree) element));
      }
    }
    return bindingIdentifiers;
  }

  private List<IdentifierTree> identifierFromBindingElement(BindingElementTree bindingEement) {
    List<IdentifierTree> bindingIdentifiers = Lists.newArrayList();

   if (bindingEement.is(Kind.BINDING_IDENTIFIER)) {
      bindingIdentifiers.add((IdentifierTree) bindingEement);

    } else if (bindingEement.is(Kind.OBJECT_BINDING_PATTERN)) {
      bindingIdentifiers.addAll(((ObjectBindingPatternTreeImpl) bindingEement).bindingIdentifiers());

    } else {
      bindingIdentifiers.addAll(((ArrayBindingPatternTreeImpl) bindingEement).bindingIdentifiers());
    }

    return bindingIdentifiers;
  }

}
