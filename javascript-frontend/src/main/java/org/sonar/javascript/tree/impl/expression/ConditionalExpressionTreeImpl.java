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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ConditionalExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ConditionalExpressionTreeImpl extends JavaScriptTree implements ConditionalExpressionTree, TypableTree {

  private final ExpressionTree condition;
  private final SyntaxToken query;
  private final ExpressionTree trueExpression;
  private final SyntaxToken colon;
  private final ExpressionTree falseExpression;

  public ConditionalExpressionTreeImpl(
    ExpressionTree condition, InternalSyntaxToken query,
    ExpressionTree trueExpression, InternalSyntaxToken colon, ExpressionTree falseExpression
  ) {
    this.condition = condition;
    this.query = query;
    this.trueExpression = trueExpression;
    this.colon = colon;
    this.falseExpression = falseExpression;
  }

  @Override
  public ExpressionTree condition() {
    return condition;
  }

  @Override
  public SyntaxToken query() {
    return query;
  }

  @Override
  public ExpressionTree trueExpression() {
    return trueExpression;
  }

  @Override
  public SyntaxToken colon() {
    return colon;
  }

  @Override
  public ExpressionTree falseExpression() {
    return falseExpression;
  }

  @Override
  public Kind getKind() {
    return Kind.CONDITIONAL_EXPRESSION;
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(condition, query, trueExpression, colon, falseExpression);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitConditionalExpression(this);
  }

  @Override
  public void add(Type type) {
    throw new UnsupportedOperationException();
  }
}
