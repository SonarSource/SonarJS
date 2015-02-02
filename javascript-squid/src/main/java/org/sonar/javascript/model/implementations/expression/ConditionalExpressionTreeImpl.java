/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.model.implementations.expression;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ConditionalExpressionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;

public class ConditionalExpressionTreeImpl extends JavaScriptTree implements ConditionalExpressionTree {

  private ExpressionTree condition;
  private final SyntaxToken query;
  private final ExpressionTree trueExpression;
  private final SyntaxToken colon;
  private final ExpressionTree falseExpression;

  public ConditionalExpressionTreeImpl(InternalSyntaxToken query, ExpressionTree trueExpression, InternalSyntaxToken colon, ExpressionTree falseExpression) {
    super(Kind.CONDITIONAL_EXPRESSION);
    this.query = query;
    this.trueExpression = trueExpression;
    this.colon = colon;
    this.falseExpression = falseExpression;

    addChildren(query, (AstNode) trueExpression, colon, (AstNode) falseExpression);
  }

  public ConditionalExpressionTreeImpl complete(ExpressionTree condition) {
    this.condition = condition;

    prependChildren((AstNode) condition);
    return this;
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
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>forArray(condition, trueExpression, falseExpression);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitConditionalExpression(this);
  }
}
