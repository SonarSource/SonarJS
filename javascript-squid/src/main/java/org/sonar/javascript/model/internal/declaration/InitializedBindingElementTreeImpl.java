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

import java.util.Iterator;
import java.util.List;

import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;

public class InitializedBindingElementTreeImpl extends JavaScriptTree implements InitializedBindingElementTree {

  private BindingElementTree left;
  private final SyntaxToken equalToken;
  private final ExpressionTree right;

  public InitializedBindingElementTreeImpl(InternalSyntaxToken equalToken, ExpressionTree right) {
    super(Kind.INITIALIZED_BINDING_ELEMENT);

    this.equalToken = equalToken;
    this.right = right;

    addChildren(equalToken, (AstNode) right);
  }

  public InitializedBindingElementTreeImpl completeWithLeft(BindingElementTree left) {
    this.left = left;

    prependChildren((AstNode) left);
    return this;
  }

  @Override
  public BindingElementTree left() {
    return left;
  }

  @Override
  public SyntaxToken equalToken() {
    return equalToken;
  }

  @Override
  public ExpressionTree right() {
    return right;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(left, right);
  }

  @Override
  public AstNodeType getKind() {
    return Kind.INITIALIZED_BINDING_ELEMENT;
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitInitializedBindingElement(this);
  }

  public List<IdentifierTree> bindingIdentifiers() {
    List<IdentifierTree> bindingIdentifiers = Lists.newArrayList();

    if (left.is(Kind.BINDING_IDENTIFIER)) {
      return Lists.newArrayList((IdentifierTree) left);

    } else if (left.is(Kind.OBJECT_BINDING_PATTERN)) {
      bindingIdentifiers.addAll(((ObjectBindingPatternTreeImpl) left).bindingIdentifiers());

    } else {
      bindingIdentifiers.addAll(((ArrayBindingPatternTreeImpl) left).bindingIdentifiers());
    }

    return bindingIdentifiers;
  }

}
