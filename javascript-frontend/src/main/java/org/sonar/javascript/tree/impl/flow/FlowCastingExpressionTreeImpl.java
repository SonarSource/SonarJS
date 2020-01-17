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
package org.sonar.javascript.tree.impl.flow;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowCastingExpressionTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowCastingExpressionTreeImpl extends JavaScriptTree implements FlowCastingExpressionTree {

  private final SyntaxToken leftParenthesisToken;
  private final ExpressionTree value;
  private final SyntaxToken colonToken;
  private final FlowTypeTree type;
  private final SyntaxToken rightParenthesisToken;

  public FlowCastingExpressionTreeImpl(
    SyntaxToken leftParenthesisToken, ExpressionTree value, SyntaxToken colonToken, FlowTypeTree type, SyntaxToken rightParenthesisToken
  ) {
    this.leftParenthesisToken = leftParenthesisToken;
    this.value = value;
    this.colonToken = colonToken;
    this.type = type;
    this.rightParenthesisToken = rightParenthesisToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_CASTING_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(leftParenthesisToken, value, colonToken, type, rightParenthesisToken);
  }

  @Override
  public SyntaxToken leftParenthesisToken() {
    return leftParenthesisToken;
  }

  @Override
  public ExpressionTree value() {
    return value;
  }

  @Override
  public SyntaxToken colonToken() {
    return colonToken;
  }

  @Override
  public FlowTypeTree type() {
    return type;
  }

  @Override
  public SyntaxToken rightParenthesisToken() {
    return rightParenthesisToken;
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowCastingExpression(this);
  }
}
