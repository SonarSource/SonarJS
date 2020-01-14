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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.DecoratorTree;
import org.sonar.plugins.javascript.api.tree.declaration.MethodDeclarationTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class MethodDeclarationTreeImpl extends FunctionTreeImpl implements MethodDeclarationTree {

  private final Kind kind;

  private final List<DecoratorTree> decorators;
  private final InternalSyntaxToken staticToken;
  private final InternalSyntaxToken starToken;
  private final SyntaxToken asyncToken;
  private final Tree name;
  private final FlowGenericParameterClauseTree genericParameterClause;
  private final ParameterListTree parameters;
  private final  FlowTypeAnnotationTree returnType;
  private final BlockTree body;

  private MethodDeclarationTreeImpl(
    List<DecoratorTree> decorators, @Nullable InternalSyntaxToken staticToken,
    @Nullable InternalSyntaxToken starToken,
    @Nullable InternalSyntaxToken asyncToken,
    Tree name,
    @Nullable FlowGenericParameterClauseTree genericParameterClause,
    ParameterListTree parameters,
    @Nullable FlowTypeAnnotationTree returnType,
    BlockTree body
  ) {
    this.decorators = decorators;
    this.staticToken = staticToken;
    this.asyncToken = asyncToken;
    this.starToken = starToken;
    this.kind = starToken == null ? Kind.METHOD : Kind.GENERATOR_METHOD;
    this.name = name;
    this.genericParameterClause = genericParameterClause;
    this.parameters = parameters;
    this.returnType = returnType;
    this.body = body;
  }

  public static MethodDeclarationTreeImpl generator(
    List<DecoratorTree> decorators, @Nullable InternalSyntaxToken staticToken,
    InternalSyntaxToken starToken,
    Tree name,
    @Nullable FlowGenericParameterClauseTree genericParameterClause,
    ParameterListTree parameters,
    @Nullable FlowTypeAnnotationTree returnType,
    BlockTree body
  ) {
    return new MethodDeclarationTreeImpl(decorators, staticToken, starToken, null, name, genericParameterClause, parameters, returnType, body);
  }

  public static MethodDeclarationTreeImpl method(
    List<DecoratorTree> decorators, @Nullable InternalSyntaxToken staticToken,
    @Nullable InternalSyntaxToken asyncToken,
    Tree name,
    @Nullable FlowGenericParameterClauseTree genericParameterClause,
    ParameterListTree parameters,
    @Nullable FlowTypeAnnotationTree returnType,
    BlockTree body
  ) {
    return new MethodDeclarationTreeImpl(decorators, staticToken, null, asyncToken, name, genericParameterClause, parameters, returnType, body);
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

  @Nullable
  @Override
  public SyntaxToken starToken() {
    return starToken;
  }

  @Override
  public Tree name() {
    return name;
  }

  @Nullable
  @Override
  public FlowGenericParameterClauseTree genericParameterClause() {
    return genericParameterClause;
  }

  @Nullable
  @Override
  public SyntaxToken asyncToken() {
    return asyncToken;
  }

  @Override
  public ParameterListTree parameterClause() {
    return parameters;
  }

  @Nullable
  @Override
  public FlowTypeAnnotationTree returnType() {
    return returnType;
  }

  @Override
  public BlockTree body() {
    return body;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      decorators.iterator(),
      Iterators.forArray(staticToken, asyncToken, starToken, name, genericParameterClause, parameters, returnType, body));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitMethodDeclaration(this);
  }

  @Override
  public List<BindingElementTree> parameterList() {
    return parameters.parameters();
  }
}
