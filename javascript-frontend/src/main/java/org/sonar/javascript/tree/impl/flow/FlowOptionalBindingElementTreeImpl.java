/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.tree.impl.flow;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowOptionalBindingElementTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowOptionalBindingElementTreeImpl extends JavaScriptTree implements FlowOptionalBindingElementTree {

  private final BindingElementTree bindingElement;
  private final SyntaxToken questionToken;

  public FlowOptionalBindingElementTreeImpl(BindingElementTree bindingElement, SyntaxToken questionToken) {
    this.bindingElement = bindingElement;
    this.questionToken = questionToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_OPTIONAL_BINDING_ELEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(bindingElement, questionToken);
  }

  @Override
  public BindingElementTree bindingElement() {
    return bindingElement;
  }

  @Override
  public SyntaxToken questionToken() {
    return questionToken;
  }

  @Override
  public List<IdentifierTree> bindingIdentifiers() {
    return bindingElement.bindingIdentifiers();
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowOptionalBindingElement(this);
  }
}
