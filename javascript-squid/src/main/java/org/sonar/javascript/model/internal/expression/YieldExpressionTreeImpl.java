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
package org.sonar.javascript.model.internal.expression;

import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.YieldExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import javax.annotation.Nullable;
import java.util.Iterator;

public class YieldExpressionTreeImpl extends JavaScriptTree implements YieldExpressionTree {

  private InternalSyntaxToken yieldKeyword;
  @Nullable
  private final InternalSyntaxToken star;
  private final ExpressionTree argument;

  public YieldExpressionTreeImpl(InternalSyntaxToken yieldKeyword) {
    super(Kind.YIELD_EXPRESSION);
    this.yieldKeyword = yieldKeyword;
    this.star = null;
    this.argument = null;

    addChildren(yieldKeyword);
  }

  public YieldExpressionTreeImpl(InternalSyntaxToken star, ExpressionTree argument) {
    super(Kind.YIELD_EXPRESSION);
    this.star = star;
    this.argument = argument;

    addChildren(star, (AstNode) argument);
  }

  public YieldExpressionTreeImpl(ExpressionTree argument) {
    super(Kind.YIELD_EXPRESSION);
    this.star = null;
    this.argument = argument;

    addChildren((AstNode) argument);
  }

  public YieldExpressionTreeImpl complete(InternalSyntaxToken yieldKeyword) {
    this.yieldKeyword = yieldKeyword;

    prependChildren(yieldKeyword);
    return this;
  }

  @Override
  public SyntaxToken yieldKeyword() {
    return yieldKeyword;
  }

  @Nullable
  @Override
  public SyntaxToken star() {
    return star;
  }

  @Override
  public ExpressionTree argument() {
    return argument;
  }

  @Override
  public AstNodeType getKind() {
    return Kind.YIELD_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>singletonIterator(argument);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitYieldExpression(this);
  }
}
