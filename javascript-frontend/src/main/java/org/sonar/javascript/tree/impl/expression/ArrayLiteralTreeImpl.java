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
import com.google.common.collect.Iterables;
import com.google.common.collect.Iterators;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.javascript.tree.symbols.type.TypableTree;
import org.sonar.plugins.javascript.api.symbols.Type;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayLiteralTree;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ArrayLiteralTreeImpl extends JavaScriptTree implements ArrayLiteralTree, TypableTree {

  private SyntaxToken openBracket;
  private final List<ExpressionTree> elements;
  private final List<Tree> elementsAndCommas;
  private SyntaxToken closeBracket;
  private TypeSet types = TypeSet.emptyTypeSet();

  public ArrayLiteralTreeImpl(InternalSyntaxToken openBracket, InternalSyntaxToken closeBracket) {
    this.openBracket = openBracket;
    this.elements = Collections.emptyList();
    this.elementsAndCommas = Collections.emptyList();
    this.closeBracket = closeBracket;
  }

  public ArrayLiteralTreeImpl(List<Tree> elementsAndCommas) {
    this.elementsAndCommas = elementsAndCommas;
    this.elements = ImmutableList.copyOf(Iterables.filter(elementsAndCommas, ExpressionTree.class));
  }

  public ArrayLiteralTreeImpl complete(InternalSyntaxToken openBracket, InternalSyntaxToken closeBracket) {
    this.openBracket = openBracket;
    this.closeBracket = closeBracket;
    return this;
  }

  @Override
  public SyntaxToken openBracket() {
    return openBracket;
  }

  @Override
  public List<ExpressionTree> elements() {
    return elements;
  }

  @Override
  public List<Tree> elementsAndCommas() {
    return elementsAndCommas;
  }

  @Override
  public SyntaxToken closeBracket() {
    return closeBracket;
  }

  @Override
  public Kind getKind() {
    return Kind.ARRAY_LITERAL;
  }

  @Override
  public TypeSet types() {
    return types.immutableCopy();
  }

  @Override
  public void add(Type type) {
    this.types.add(type);
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(openBracket),
      elementsAndCommas.iterator(),
      Iterators.singletonIterator(closeBracket)
    );
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitArrayLiteral(this);
  }
}
