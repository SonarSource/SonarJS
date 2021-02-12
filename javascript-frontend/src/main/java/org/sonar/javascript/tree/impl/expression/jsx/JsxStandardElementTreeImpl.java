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
package org.sonar.javascript.tree.impl.expression.jsx;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxChildTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxClosingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxOpeningElementTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxStandardElementTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class JsxStandardElementTreeImpl extends JavaScriptTree implements JsxStandardElementTree {

  private final JsxOpeningElementTree openingElement;
  private final List<JsxChildTree> children;
  private final JsxClosingElementTree closingElement;

  public JsxStandardElementTreeImpl(JsxOpeningElementTree openingElement, List<JsxChildTree> children, JsxClosingElementTree closingElement) {
    this.openingElement = openingElement;
    this.children = children;
    this.closingElement = closingElement;
  }


  @Override
  public JsxOpeningElementTree openingElement() {
    return openingElement;
  }

  @Override
  public List<JsxChildTree> children() {
    return children;
  }

  @Override
  public JsxClosingElementTree closingElement() {
    return closingElement;
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  @Override
  public Kind getKind() {
    return Kind.JSX_STANDARD_ELEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(openingElement),
      children.iterator(),
      Iterators.singletonIterator(closingElement)
    );
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitJsxStandardElement(this);
  }
}
