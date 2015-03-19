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

import java.util.Iterator;
import java.util.List;

import org.sonar.plugins.javascript.api.visitors.TreeVisitor;
import org.sonar.javascript.model.internal.JavaScriptTree;
import org.sonar.javascript.model.internal.declaration.ParameterListTreeImpl;
import org.sonar.javascript.model.internal.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;

public class ArrowFunctionTreeImpl extends JavaScriptTree implements ArrowFunctionTree {

  private final Tree parameters;
  private final SyntaxToken doubleArrow;
  private Tree body;

  public ArrowFunctionTreeImpl(Tree parameters, InternalSyntaxToken doubleArrow, Tree body) {
    super(Kind.ARROW_FUNCTION);
    this.parameters = parameters;
    this.doubleArrow = doubleArrow;
    this.body = body;

    addChildren((AstNode) parameters, doubleArrow, (AstNode) body);
  }

  @Override
  public Tree parameters() {
    return parameters;
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
    return Iterators.forArray(parameters, body);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitArrowFunction(this);
  }

  public List<IdentifierTree> parameterIdentifiers() {
    if (parameters.is(Kind.BINDING_IDENTIFIER)) {
      return ImmutableList.of((IdentifierTree) parameters);
    } else {
      return ((ParameterListTreeImpl) parameters).parameterIdentifiers();
    }
  }
}
