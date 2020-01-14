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
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowFunctionTypeTreeImpl extends JavaScriptTree implements FlowFunctionTypeTree {
  private final FlowGenericParameterClauseTree genericParameterClause;
  private final FlowFunctionTypeParameterClauseTree parameterClause;
  private final SyntaxToken doubleArrowToken;
  private final FlowTypeTree returnType;

  public FlowFunctionTypeTreeImpl(
    @Nullable FlowGenericParameterClauseTree genericParameterClause,
    FlowFunctionTypeParameterClauseTree parameterClause, SyntaxToken doubleArrowToken, FlowTypeTree returnType
  ) {
    this.genericParameterClause = genericParameterClause;
    this.doubleArrowToken = doubleArrowToken;
    this.parameterClause = parameterClause;
    this.returnType = returnType;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_FUNCTION_TYPE;
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
  public SyntaxToken doubleArrowToken() {
    return doubleArrowToken;
  }

  @Override
  public FlowTypeTree returnType() {
    return returnType;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(genericParameterClause, parameterClause, doubleArrowToken, returnType);
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowFunctionType(this);
  }
}
