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
package org.sonar.javascript.tree.impl.declaration;

import com.google.common.base.Functions;
import com.google.common.base.Preconditions;
import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import java.util.Iterator;
import java.util.List;
import org.apache.commons.collections.ListUtils;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.declaration.ParameterListTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.RestElementTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ParameterListTreeImpl extends JavaScriptTree implements ParameterListTree {

  private InternalSyntaxToken openParenthesis;
  private final SeparatedList<Tree> parameters;
  private InternalSyntaxToken closeParenthesis;
  private final Kind kind;

  public ParameterListTreeImpl(Kind kind, SeparatedList<Tree> parameters) {
    Preconditions.checkArgument(parameters.size() == parameters.getSeparators().size() + 1);
    this.kind = kind;
    this.parameters = parameters;

  }

  public ParameterListTreeImpl(Kind kind, InternalSyntaxToken openParenthesis, InternalSyntaxToken closeParenthesis) {
    this.kind = kind;
    this.openParenthesis = openParenthesis;
    this.parameters = new SeparatedList<>(ListUtils.EMPTY_LIST, ListUtils.EMPTY_LIST);
    this.closeParenthesis = closeParenthesis;
  }

  public ParameterListTreeImpl complete(InternalSyntaxToken openParenthesis, InternalSyntaxToken closeParenthesis) {
    this.openParenthesis = openParenthesis;
    this.closeParenthesis = closeParenthesis;

    return this;
  }

  @Override
  public SyntaxToken openParenthesis() {
    return openParenthesis;
  }

  @Override
  public SeparatedList<Tree> parameters() {
    return parameters;
  }

  @Override
  public SyntaxToken closeParenthesis() {
    return closeParenthesis;
  }

  @Override
  public Kind getKind() {
    return kind;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(openParenthesis),
      parameters.elementsAndSeparators(Functions.<Tree>identity()),
      Iterators.singletonIterator(closeParenthesis));
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitParameterList(this);
  }

  public List<IdentifierTree> parameterIdentifiers() {
    List<IdentifierTree> identifiers = Lists.newArrayList();

    for (Tree parameter : parameters) {

      if (parameter.is(Tree.Kind.BINDING_IDENTIFIER)) {
        identifiers.add((IdentifierTree) parameter);

      } else if (parameter.is(Tree.Kind.INITIALIZED_BINDING_ELEMENT)) {
        identifiers.addAll(((InitializedBindingElementTreeImpl) parameter).bindingIdentifiers());

      } else if (parameter.is(Tree.Kind.OBJECT_BINDING_PATTERN)) {
        identifiers.addAll(((ObjectBindingPatternTreeImpl) parameter).bindingIdentifiers());

      } else if (parameter.is(Kind.REST_ELEMENT)) {
        identifiers.add((IdentifierTree) ((RestElementTree) parameter).element());

      } else {
        identifiers.addAll(((ArrayBindingPatternTreeImpl) parameter).bindingIdentifiers());
      }
    }
    return identifiers;
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }
}
