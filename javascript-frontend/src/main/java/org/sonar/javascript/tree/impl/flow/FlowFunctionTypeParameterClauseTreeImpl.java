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

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowFunctionTypeParameterTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowFunctionTypeParameterClauseTreeImpl extends JavaScriptTree implements FlowFunctionTypeParameterClauseTree {
  private final InternalSyntaxToken lParenthesis;
  private final SeparatedList<FlowFunctionTypeParameterTree> parameters;
  private final InternalSyntaxToken rParenthesis;

  public FlowFunctionTypeParameterClauseTreeImpl(
    @Nullable InternalSyntaxToken lParenthesis,
    SeparatedList<FlowFunctionTypeParameterTree> parameters,
    @Nullable InternalSyntaxToken rParenthesis
  ) {
    this.lParenthesis = lParenthesis;
    this.parameters = parameters;
    this.rParenthesis = rParenthesis;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_FUNCTION_TYPE_PARAMETER_CLAUSE;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(Iterators.singletonIterator(lParenthesis),
      parameters.elementsAndSeparators(Functions.identity()),
      Iterators.singletonIterator(rParenthesis));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowFunctionTypeParameterClause(this);
  }

  @Override
  @Nullable
  public SyntaxToken leftParenthesis() {
    return lParenthesis;
  }

  @Override
  public SeparatedList<FlowFunctionTypeParameterTree> parameters() {
    return parameters;
  }

  @Override
  @Nullable
  public SyntaxToken rightParenthesis() {
    return rParenthesis;
  }
}
