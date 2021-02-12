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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ParenthesisedExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ParenthesisedExpressionTreeImpl extends JavaScriptTree implements ParenthesisedExpressionTree, TypableTree {

  private final InternalSyntaxToken openParenthesis;
  private final ExpressionTree expression;
  private final InternalSyntaxToken closeParenthesis;
  private TypeSet types = TypeSet.emptyTypeSet();

  public ParenthesisedExpressionTreeImpl(InternalSyntaxToken openParenthesis, ExpressionTree expression, InternalSyntaxToken closeParenthesis) {
    this.openParenthesis = openParenthesis;
    this.expression = expression;
    this.closeParenthesis = closeParenthesis;

  }

  @Override
  public SyntaxToken openParenthesisToken() {
    return openParenthesis;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Override
  public SyntaxToken closeParenthesisToken() {
    return closeParenthesis;
  }

  @Override
  public Kind getKind() {
    return Kind.PARENTHESISED_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>concat(
      Iterators.singletonIterator(openParenthesis),
      Iterators.singletonIterator(expression),
      Iterators.singletonIterator(closeParenthesis)
    );
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitParenthesisedExpression(this);
  }

  @Override
  public TypeSet types() {
    return types.immutableCopy();
  }

  @Override
  public void add(Type type) {
    this.types.add(type);
  }
}
