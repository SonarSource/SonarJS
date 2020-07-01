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
package org.sonar.javascript.tree.impl.expression.jsx;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxEmptyClosingElementTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class JsxEmptyClosingElementTreeImpl extends JavaScriptTree implements JsxEmptyClosingElementTree {

  private final SyntaxToken ltToken;
  private final SyntaxToken slashToken;
  private final SyntaxToken gtToken;

  public JsxEmptyClosingElementTreeImpl(SyntaxToken ltToken, SyntaxToken slashToken, SyntaxToken gtToken) {
    this.ltToken = ltToken;
    this.gtToken = gtToken;
    this.slashToken = slashToken;
  }

  @Override
  public Kind getKind() {
    return Kind.JSX_EMPTY_CLOSING_ELEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(ltToken, slashToken, gtToken);
  }

  @Override
  public SyntaxToken openAngleBracketToken() {
    return ltToken;
  }

  @Override
  public SyntaxToken slashToken() {
    return slashToken;
  }

  @Override
  public SyntaxToken closeAngleBracketToken() {
    return gtToken;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitJsxEmptyClosingElement(this);
  }
}
