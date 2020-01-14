/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class RestElementTreeImpl extends JavaScriptTree implements RestElementTree {

  private final SyntaxToken ellipsis;
  private final BindingElementTree element;

  public RestElementTreeImpl(InternalSyntaxToken ellipsis, BindingElementTree element) {
    this.ellipsis = ellipsis;
    this.element = element;

  }

  @Override
  public SyntaxToken ellipsisToken() {
    return ellipsis;
  }

  @Override
  public BindingElementTree element() {
    return element;
  }

  @Override
  public Kind getKind() {
    return Kind.REST_ELEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(ellipsis, element);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitRestElement(this);
  }

  @Override
  public List<IdentifierTree> bindingIdentifiers() {
    return element.bindingIdentifiers();
  }
}
