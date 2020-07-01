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
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ComputedPropertyNameTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ComputedPropertyNameTreeImpl extends JavaScriptTree implements ComputedPropertyNameTree {

  private final SyntaxToken openBracket;
  private final ExpressionTree expression;
  private final SyntaxToken closeBracket;

  public ComputedPropertyNameTreeImpl(InternalSyntaxToken openBracket, ExpressionTree expression, InternalSyntaxToken closeBracket) {
    this.openBracket = openBracket;
    this.expression = expression;
    this.closeBracket = closeBracket;

  }

  @Override
  public SyntaxToken openCurlyBraceToken() {
    return openBracket;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Override
  public SyntaxToken closeCurlyBraceToken() {
    return closeBracket;
  }

  @Override
  public Kind getKind() {
    return Kind.COMPUTED_PROPERTY_NAME;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(openBracket, expression, closeBracket);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitComputedPropertyName(this);
  }
}
