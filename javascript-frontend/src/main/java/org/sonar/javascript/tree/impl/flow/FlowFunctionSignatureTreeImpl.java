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
package org.sonar.javascript.tree.impl.flow;

import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionSignatureTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

import static org.sonar.plugins.javascript.api.tree.Tree.Kind.FLOW_FUNCTION_SIGNATURE;

public class FlowFunctionSignatureTreeImpl extends JavaScriptTree implements FlowFunctionSignatureTree {

  private final SyntaxToken functionToken;
  private final IdentifierTree  name;
  private final FlowGenericParameterClauseTree genericParameterClause;
  private final FlowFunctionTypeParameterClauseTree parameterClause;
  private final FlowTypeAnnotationTree returnType;

  public FlowFunctionSignatureTreeImpl(SyntaxToken functionToken, IdentifierTree name, FlowGenericParameterClauseTree genericParameterClause, FlowFunctionTypeParameterClauseTree parameterClause, FlowTypeAnnotationTree returnType) {
    this.functionToken = functionToken;
    this.name = name;
    this.genericParameterClause = genericParameterClause;
    this.parameterClause = parameterClause;
    this.returnType = returnType;
  }

  @Override
  public Kind getKind() {
    return FLOW_FUNCTION_SIGNATURE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(functionToken, name, genericParameterClause, parameterClause, returnType);
  }

  @Override
  public SyntaxToken functionToken() {
    return functionToken;
  }

  @Override
  public IdentifierTree name() {
    return name;
  }

  @Nullable
  @Override
  public FlowGenericParameterClauseTree genericParameterClause() {
    return genericParameterClause;
  }

  @Override
  public FlowFunctionTypeParameterClauseTree parameterClause() {
    return parameterClause;
  }

  @Override
  public FlowTypeAnnotationTree returnType() {
    return returnType;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowFunctionSignature(this);
  }
}
