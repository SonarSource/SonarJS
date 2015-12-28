/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.declaration.ParameterListTreeImpl;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ArrowFunctionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.TreeVisitor;

public class ArrowFunctionTreeImpl extends JavaScriptTree implements ArrowFunctionTree, TypableTree {

  private final Tree parameters;
  private final SyntaxToken doubleArrow;
  private Tree body;

  public ArrowFunctionTreeImpl(Tree parameters, InternalSyntaxToken doubleArrow, Tree body) {
    this.parameters = parameters;
    this.doubleArrow = doubleArrow;
    this.body = body;
  }

  @Override
  public Tree parameters() {
    return parameters;
  }

  @Override
  public SyntaxToken doubleArrow() {
    return doubleArrow;
  }

  @Override
  public Tree conciseBody() {
    return body;
  }

  @Override
  public Kind getKind() {
    return Kind.ARROW_FUNCTION;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.forArray(parameters, doubleArrow, body);
  }

  @Override
  public void accept(TreeVisitor visitor) {
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
    return TypeSet.emptyTypeSet();
  }

  @Override
  public void add(Type type) {
    throw new UnsupportedOperationException();
  }
}
