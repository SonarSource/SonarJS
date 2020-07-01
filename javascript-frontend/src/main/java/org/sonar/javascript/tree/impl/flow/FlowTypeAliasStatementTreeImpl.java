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
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAliasStatementTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeAnnotationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowTypeTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowTypeAliasStatementTreeImpl extends JavaScriptTree implements FlowTypeAliasStatementTree {

  private final SyntaxToken opaqueToken;
  private final SyntaxToken typeToken;
  private final IdentifierTree typeAlias;
  private final FlowGenericParameterClauseTree genericParameterClause;
  private final FlowTypeAnnotationTree superTypeAnnotation;
  private final SyntaxToken equalToken;
  private final FlowTypeTree type;
  private final SyntaxToken semicolonToken;

  public FlowTypeAliasStatementTreeImpl(
    @Nullable SyntaxToken opaqueToken, SyntaxToken typeToken,
    IdentifierTree typeAlias, @Nullable FlowGenericParameterClauseTree genericParameterClause,
    @Nullable FlowTypeAnnotationTree superTypeAnnotation,
    SyntaxToken equalToken, FlowTypeTree type, @Nullable SyntaxToken semicolonToken
  ) {
    this.opaqueToken = opaqueToken;
    this.typeToken = typeToken;
    this.typeAlias = typeAlias;
    this.genericParameterClause = genericParameterClause;
    this.superTypeAnnotation = superTypeAnnotation;
    this.equalToken = equalToken;
    this.type = type;
    this.semicolonToken = semicolonToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_TYPE_ALIAS_STATEMENT;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(opaqueToken, typeToken, typeAlias, genericParameterClause, superTypeAnnotation, equalToken, type, semicolonToken);
  }

  @Nullable
  @Override
  public SyntaxToken opaqueToken() {
    return opaqueToken;
  }

  @Override
  public SyntaxToken typeToken() {
    return typeToken;
  }

  @Override
  public IdentifierTree typeAlias() {
    return typeAlias;
  }

  @Nullable
  @Override
  public FlowGenericParameterClauseTree genericParameterClause() {
    return genericParameterClause;
  }

  @Nullable
  @Override
  public FlowTypeAnnotationTree superTypeAnnotation() {
    return superTypeAnnotation;
  }

  @Override
  public SyntaxToken equalToken() {
    return equalToken;
  }

  @Override
  public FlowTypeTree type() {
    return type;
  }

  @Nullable
  @Override
  public SyntaxToken semicolonToken() {
    return semicolonToken;
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowTypeAliasStatement(this);
  }
}
