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
import org.sonar.javascript.model.interfaces.declaration.BindingElementTree;
import org.sonar.javascript.model.interfaces.declaration.BindingPropertyTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;

public class BindingPropertyTreeImpl extends JavaScriptTree implements BindingPropertyTree {

  private final ExpressionTree name;
  private final SyntaxToken colonToken;
  private final BindingElementTree value;

  public BindingPropertyTreeImpl(ExpressionTree name, InternalSyntaxToken colonToken, BindingElementTree value) {
    super(Kind.BINDING_PROPERTY);
    this.name = name;
    this.colonToken = colonToken;
    this.value = value;

    addChildren((AstNode) name, colonToken, (AstNode) value);
  }

  @Override
  public ExpressionTree name() {
    return name;
  }

  @Override
  public SyntaxToken colonToken() {
    return colonToken;
  }

  @Override
  public BindingElementTree value() {
    return value;
  }

  @Override
  public Kind getKind() {
    return Kind.BINDING_PROPERTY;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(name, value);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitBindingProperty(this);
  }
}
