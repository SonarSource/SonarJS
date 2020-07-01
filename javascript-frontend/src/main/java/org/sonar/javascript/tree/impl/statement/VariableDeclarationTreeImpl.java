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
package org.sonar.javascript.tree.impl.statement;

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.BindingElementTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.VariableDeclarationTree;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class VariableDeclarationTreeImpl extends JavaScriptTree implements VariableDeclarationTree {

  private final Kind kind;
  private final InternalSyntaxToken token;
  private final SeparatedList<BindingElementTree> variables;

  public VariableDeclarationTreeImpl(Kind kind, InternalSyntaxToken token, SeparatedList<BindingElementTree> variables) {

    this.kind = kind;
    this.token = token;
    this.variables = variables;

  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public SyntaxToken token() {
    return token;
  }

  @Override
  public SeparatedList<BindingElementTree> variables() {
    return variables;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(token),
      variables.elementsAndSeparators(Functions.identity())
    );
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitVariableDeclaration(this);
  }

  public List<IdentifierTree> variableIdentifiers() {
    List<IdentifierTree> identifiers = Lists.newArrayList();

    for (BindingElementTree variable : variables) {
      identifiers.addAll(variable.bindingIdentifiers());
    }

    return identifiers;
  }
}
