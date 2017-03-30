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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.AccessorMethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class AccessorMethodDeclarationTreeImpl extends FunctionTreeImpl implements AccessorMethodDeclarationTree {

  private final Kind kind;

  private final List<DecoratorTree> decorators;
  private InternalSyntaxToken staticToken;
  private final InternalSyntaxToken accessorToken;
  private final Tree name;
  private final ParameterListTree parameters;
  private final BlockTree body;

  public AccessorMethodDeclarationTreeImpl(
    List<DecoratorTree> decorators, @Nullable InternalSyntaxToken staticToken,
    InternalSyntaxToken accessorToken,
    Tree name,
    ParameterListTree parameters,
    BlockTree body
  ) {
    this.decorators = decorators;
    this.staticToken = staticToken;
    this.kind = "get".equals(accessorToken.text()) ? Kind.GET_METHOD : Kind.SET_METHOD;
    this.accessorToken = accessorToken;
    this.name = name;
    this.parameters = parameters;
    this.body = body;
  }

  @Override
  public List<DecoratorTree> decorators() {
    return decorators;
  }

  @Nullable
  @Override
  public SyntaxToken staticToken() {
    return staticToken;
  }

  @Override
  public InternalSyntaxToken accessorToken() {
    Preconditions.checkState(this.is(Kind.GET_METHOD) || this.is(Kind.SET_METHOD));
    return accessorToken;
  }

  @Override
  public Tree name() {
    return name;
  }

  @Nullable
  @Override
  public SyntaxToken asyncToken() {
    return null;
  }

  @Override
  public ParameterListTree parameterClause() {
    return parameters;
  }

  @Override
  public BlockTree body() {
    return body;
  }

  @Override
  public List<Tree> parameterList() {
    return parameters.parameters();
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      decorators.iterator(),
      Iterators.forArray(staticToken, accessorToken, name, parameters, body));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitMethodDeclaration(this);
  }
}
