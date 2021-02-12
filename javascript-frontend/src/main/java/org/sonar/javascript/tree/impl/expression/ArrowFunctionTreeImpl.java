/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.declaration.FunctionTreeImpl;
import org.sonar.javascript.tree.impl.declaration.ParameterListTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.FunctionType;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ArrowFunctionTreeImpl extends FunctionTreeImpl implements ArrowFunctionTree, TypableTree {

  private final SyntaxToken asyncToken;
  private final FlowGenericParameterClauseTree genericParameterClause;
  private final Tree parameters;
  private final FlowTypeAnnotationTree returnType;
  private final SyntaxToken doubleArrow;
  private Tree body;
  private Type functionType;

  public ArrowFunctionTreeImpl(@Nullable SyntaxToken asyncToken, FlowGenericParameterClauseTree genericParameterClause, Tree parameters, @Nullable FlowTypeAnnotationTree returnType, InternalSyntaxToken doubleArrow, Tree body) {
    this.asyncToken = asyncToken;
    this.genericParameterClause = genericParameterClause;
    this.parameters = parameters;
    this.returnType = returnType;
    this.doubleArrow = doubleArrow;
    this.body = body;

    this.functionType = FunctionType.create(this);
  }

  @Nullable
  @Override
  public SyntaxToken asyncToken() {
    return asyncToken;
  }

  @Nullable
  @Override
  public Tree name() {
    return null;
  }

  @Nullable
  @Override
  public FlowGenericParameterClauseTree genericParameterClause() {
    return genericParameterClause;
  }

  @Override
  public Tree parameterClause() {
    return parameters;
  }

  @Nullable
  @Override
  public FlowTypeAnnotationTree returnType() {
    return returnType;
  }

  @Override
  public SyntaxToken doubleArrowToken() {
    return doubleArrow;
  }

  @Override
  public Tree body() {
    return body;
  }

  @Override
  public List<BindingElementTree> parameterList() {
    if (this.parameters.is(Tree.Kind.PARAMETER_LIST)) {
      return ((ParameterListTree) this.parameters).parameters();

    } else {
      return ImmutableList.of((IdentifierTree) this.parameterClause());
    }
  }

  @Override
  public Kind getKind() {
    return Kind.ARROW_FUNCTION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(asyncToken, genericParameterClause, parameters, returnType, doubleArrow, body);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitArrowFunction(this);
  }

  public List<IdentifierTree> parameterIdentifiers() {
    if (parameters.is(Kind.BINDING_IDENTIFIER)) {
      return ImmutableList.of((IdentifierTree) parameters);
    } else {
      return ((ParameterListTreeImpl) parameters).parameterIdentifiers();
    }
  }

  @Override
  public TypeSet types() {
    TypeSet set = TypeSet.emptyTypeSet();
    set.add(functionType);
    return set;
  }

  @Override
  public void add(Type type) {
    throw new UnsupportedOperationException();
  }

}
