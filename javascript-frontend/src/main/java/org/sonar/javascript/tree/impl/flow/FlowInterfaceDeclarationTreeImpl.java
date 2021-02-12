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
package org.sonar.javascript.tree.impl.flow;

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import javax.annotation.Nullable;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowGenericParameterClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowImplementsClauseTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowInterfaceDeclarationTree;
import org.sonar.plugins.javascript.api.tree.flow.FlowPropertyDefinitionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class FlowInterfaceDeclarationTreeImpl extends JavaScriptTree implements FlowInterfaceDeclarationTree {

  private final SyntaxToken interfaceToken;
  private final IdentifierTree name;
  private final FlowGenericParameterClauseTree genericParameterClause;
  private final FlowImplementsClauseTree extendsClause;
  private final SyntaxToken leftCurlyBraceToken;
  private final SeparatedList<FlowPropertyDefinitionTree> properties;
  private final SyntaxToken rightCurlyBraceToken;

  public FlowInterfaceDeclarationTreeImpl(
    SyntaxToken interfaceToken, IdentifierTree name,
    @Nullable FlowGenericParameterClauseTree genericParameterClause, @Nullable FlowImplementsClauseTree extendsClause, SyntaxToken leftCurlyBraceToken,
    SeparatedList<FlowPropertyDefinitionTree> properties, SyntaxToken rightCurlyBraceToken
  ) {
    this.interfaceToken = interfaceToken;
    this.name = name;
    this.genericParameterClause = genericParameterClause;
    this.extendsClause = extendsClause;
    this.leftCurlyBraceToken = leftCurlyBraceToken;
    this.properties = properties;
    this.rightCurlyBraceToken = rightCurlyBraceToken;
  }

  @Override
  public Kind getKind() {
    return Kind.FLOW_INTERFACE_DECLARATION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.forArray(interfaceToken, name, genericParameterClause, extendsClause, leftCurlyBraceToken),
      properties.elementsAndSeparators(Functions.identity()),
      Iterators.singletonIterator(rightCurlyBraceToken));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitFlowInterfaceDeclaration(this);
  }

  @Override
  public SyntaxToken interfaceToken() {
    return interfaceToken;
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

  @Nullable
  @Override
  public FlowImplementsClauseTree extendsClause() {
    return extendsClause;
  }

  @Override
  public SyntaxToken leftCurlyBraceToken() {
    return leftCurlyBraceToken;
  }

  @Override
  public SeparatedList<FlowPropertyDefinitionTree> properties() {
    return properties;
  }

  @Override
  public SyntaxToken rightCurlyBraceToken() {
    return rightCurlyBraceToken;
  }
}
