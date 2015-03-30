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
package org.sonar.javascript.model.implementations.declaration;

import java.util.Iterator;

import javax.annotation.Nullable;

import org.sonar.javascript.ast.visitors.TreeVisitor;
import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.implementations.lexical.InternalSyntaxToken;
import org.sonar.javascript.model.implementations.statement.BlockTreeImpl;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.declaration.AccessorMethodDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.GeneratorMethodDeclarationTree;
import org.sonar.javascript.model.interfaces.declaration.ParameterListTree;
import org.sonar.javascript.model.interfaces.expression.ExpressionTree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.expression.LiteralTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.sonar.sslr.api.AstNode;

public class MethodDeclarationTreeImpl extends JavaScriptTree implements GeneratorMethodDeclarationTree, AccessorMethodDeclarationTree {

  private final Kind kind;
  @Nullable
  private InternalSyntaxToken staticToken;
  @Nullable
  private final InternalSyntaxToken starToken;
  @Nullable
  private final InternalSyntaxToken accessorToken;
  private final ExpressionTree name;
  private final ParameterListTreeImpl parameters;
  private final BlockTreeImpl body;

  private MethodDeclarationTreeImpl(
    Kind kind,
    @Nullable InternalSyntaxToken starToken, @Nullable InternalSyntaxToken accessorToken,
    ExpressionTree name,
    ParameterListTreeImpl parameters,
    BlockTreeImpl body) {

    super(kind);
    this.kind = kind;
    this.starToken = starToken;
    this.accessorToken = accessorToken;
    this.name = name;
    this.parameters = parameters;
    this.body = body;

    if (starToken != null) {
      addChild(starToken);
    }
    if (accessorToken != null) {
      addChild(accessorToken);
    }
    addChild((AstNode) name);
    addChild(parameters);
    addChild(body);
  }

  public static MethodDeclarationTreeImpl newMethodOrGenerator(@Nullable InternalSyntaxToken starToken, ExpressionTree name, ParameterListTreeImpl parameters, BlockTreeImpl body) {
    return new MethodDeclarationTreeImpl(starToken == null ? Kind.METHOD : Kind.GENERATOR_METHOD, starToken, null, name, parameters, body);
  }

  public static MethodDeclarationTreeImpl newAccessor(InternalSyntaxToken accessorToken, ExpressionTree name, ParameterListTreeImpl parameters, BlockTreeImpl body) {
    return new MethodDeclarationTreeImpl("get".equals(accessorToken.text()) ? Kind.GET_METHOD : Kind.SET_METHOD, null, accessorToken, name, parameters, body);
  }

  public MethodDeclarationTreeImpl completeWithStaticToken(InternalSyntaxToken staticToken) {
    this.staticToken = staticToken;

    prependChildren(staticToken);

    return this;
  }

  @Nullable
  @Override
  public SyntaxToken staticToken() {
    return staticToken;
  }

  @Override
  public SyntaxToken starToken() {
    Preconditions.checkState(this.is(Kind.GENERATOR_METHOD));
    return starToken;
  }

  @Override
  public InternalSyntaxToken accessorToken() {
    Preconditions.checkState(this.is(Kind.GET_METHOD) || this.is(Kind.SET_METHOD));
    return accessorToken;
  }

  @Override
  public ExpressionTree name() {
    return name;
  }

  public String nameToString() {
    if (name instanceof IdentifierTree) {
      return ((IdentifierTree) name).name();

    } else if (name.is(Kind.STRING_LITERAL)) {
      String value = ((LiteralTree) name).value();
      return value.substring(1, value.length() - 1);

    } else if (name.is(Kind.NUMERIC_LITERAL)) {
      // FIXME martn: handle unicode sequence
      return ((LiteralTree) name).value();

    } else {
      // FIXME martin: handle computed property name (ES6)
      return ((AstNode) name).getTokenValue();
    }
  }

  @Override
  public ParameterListTree parameters() {
    return parameters;
  }

  @Override
  public BlockTreeImpl body() {
    return body;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(name, parameters, body);
  }

  @Override
  public void accept(TreeVisitor visitor) {
    visitor.visitMethodDeclaration(this);
  }
}
