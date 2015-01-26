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

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.UnaryExpressionTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import java.util.Iterator;

public class PrefixExpressionTreeImpl extends JavaScriptTree implements UnaryExpressionTree {

  private final Kind kind;
  private final InternalSyntaxToken operator;
  private final ExpressionTree expression;

  public PrefixExpressionTreeImpl(Kind kind, InternalSyntaxToken operator, ExpressionTree expression) {
    super(kind);
    this.kind = Preconditions.checkNotNull(kind);
    this.operator = operator;
    this.expression = Preconditions.checkNotNull(expression);

    addChildren(operator, (AstNode) expression);
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public SyntaxToken operator() {
    return operator;
  }

  @Override
  public ExpressionTree expression() {
    return expression;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(expression);
  }
}
