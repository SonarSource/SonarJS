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
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.BracketMemberExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.Iterator;

public class BracketMemberExpressionTreeImpl extends JavaScriptTree implements BracketMemberExpressionTree {

  private ExpressionTree object;
  private final SyntaxToken openBracket;
  private final ExpressionTree property;
  private final SyntaxToken closeBracket;

  public BracketMemberExpressionTreeImpl(InternalSyntaxToken openBracket, ExpressionTree property, InternalSyntaxToken closeBracket) {
    super(Kind.BRACKET_MEMBER_EXPRESSION);
    this.openBracket = openBracket;
    this.property = property;
    this.closeBracket = closeBracket;

    addChildren(openBracket, (AstNode) property, closeBracket);
  }

  public BracketMemberExpressionTreeImpl complete(ExpressionTree object) {
    this.object = object;

    prependChildren((AstNode) object);
    return this;
  }

  @Override
  public ExpressionTree object() {
    return object;
  }

  @Override
  public SyntaxToken openBracket() {
    return openBracket;
  }

  @Override
  public ExpressionTree property() {
    return property;
  }

  @Override
  public SyntaxToken closeBracket() {
    return closeBracket;
  }

  @Override
  public Kind getKind() {
    return Kind.BRACKET_MEMBER_EXPRESSION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.<Tree>forArray(object, property);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitMemberExpression(this);
  }
}
