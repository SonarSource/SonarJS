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
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.jsx.JsxSpreadAttributeTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class JsxSpreadAttributeTreeImpl extends JavaScriptTree implements JsxSpreadAttributeTree {

  private final InternalSyntaxToken lCurlyBraceToken;
  private final InternalSyntaxToken ellipsisToken;
  private final ExpressionTree expressionTree;
  private final InternalSyntaxToken rCurlyBraceToken;

  public JsxSpreadAttributeTreeImpl(InternalSyntaxToken lCurlyBraceToken, InternalSyntaxToken ellipsisToken, ExpressionTree expressionTree, InternalSyntaxToken rCurlyBraceToken) {
    this.lCurlyBraceToken = lCurlyBraceToken;
    this.ellipsisToken = ellipsisToken;
    this.expressionTree = expressionTree;
    this.rCurlyBraceToken = rCurlyBraceToken;
  }

  @Override
  public Kind getKind() {
    return Kind.JSX_SPREAD_ATTRIBUTE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(lCurlyBraceToken, ellipsisToken, expressionTree, rCurlyBraceToken);
  }

  @Override
  public InternalSyntaxToken lCurlyBraceToken() {
    return lCurlyBraceToken;
  }

  @Override
  public InternalSyntaxToken ellipsisToken() {
    return ellipsisToken;
  }

  @Override
  public ExpressionTree expressionTree() {
    return expressionTree;
  }

  @Override
  public InternalSyntaxToken rCurlyBraceToken() {
    return rCurlyBraceToken;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitJsxSpreadAttribute(this);
  }
}
