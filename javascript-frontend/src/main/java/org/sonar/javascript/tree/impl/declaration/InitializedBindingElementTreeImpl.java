/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.InitializedBindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class InitializedBindingElementTreeImpl extends JavaScriptTree implements InitializedBindingElementTree {

  private final BindingElementTree left;
  private final SyntaxToken equalToken;
  private final ExpressionTree right;

  public InitializedBindingElementTreeImpl(BindingElementTree left, InternalSyntaxToken equalToken, ExpressionTree right) {
    this.left = left;
    this.equalToken = equalToken;
    this.right = right;
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
    return Iterators.forArray(left, equalToken, right);
  }

  @Override
  public Kind getKind() {
    return Kind.INITIALIZED_BINDING_ELEMENT;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitInitializedBindingElement(this);
  }

  @Override
  public List<IdentifierTree> bindingIdentifiers() {
    return left.bindingIdentifiers();
  }

}
