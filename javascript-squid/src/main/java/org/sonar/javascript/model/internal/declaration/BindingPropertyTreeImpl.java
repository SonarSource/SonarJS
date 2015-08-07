/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingPropertyTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

import java.util.Iterator;

public class BindingPropertyTreeImpl extends JavaScriptTree implements BindingPropertyTree {

  private final ExpressionTree name;
  private final SyntaxToken colonToken;
  private final BindingElementTree value;

  public BindingPropertyTreeImpl(ExpressionTree name, InternalSyntaxToken colonToken, BindingElementTree value) {
    this.name = name;
    this.colonToken = colonToken;
    this.value = value;
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
    return Iterators.forArray(name, colonToken, value);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitBindingProperty(this);
  }
}
