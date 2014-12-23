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
import com.sonar.sslr.api.AstNodeType;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.SeparatedList;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.ArrowFunctionTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import javax.annotation.Nullable;
import java.util.Iterator;
import java.util.List;

public class ArrowFunctionTreeImpl extends JavaScriptTree implements ArrowFunctionTree {

  @Nullable
  private final SyntaxToken openParenthesis;
  private final SeparatedList<ExpressionTree> parameters;
  @Nullable
  private final SyntaxToken closeParenthesis;
  private final SyntaxToken doubleArrow;
  private final Tree body;

  public ArrowFunctionTreeImpl(InternalSyntaxToken openParenthesis, SeparatedList<ExpressionTree> parameters, InternalSyntaxToken closeParenthesis,
    InternalSyntaxToken doubleArrow, Tree body, List<AstNode> children) {

    super(Kind.ARROW_FUNCTION);
    this.openParenthesis = openParenthesis;
    this.parameters = parameters;
    this.closeParenthesis = closeParenthesis;
    this.doubleArrow = doubleArrow;
    this.body = body;

    for (AstNode child : children) {
      addChild(child);
    }
  }

  @Nullable
  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Override
  public SeparatedList<ExpressionTree> parameters() {
    return parameters;
  }

  @Nullable
  @Override
  public SyntaxToken closeParenthesis() {
    return closeParenthesis;
  }

  @Override
  public SyntaxToken doubleArrow() {
    return doubleArrow;
  }

  @Override
  public Tree conciseBody() {
    return body;
  }

  @Override
  public AstNodeType getKind() {
    return Kind.ARROW_FUNCTION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.emptyIterator();
  }
}
