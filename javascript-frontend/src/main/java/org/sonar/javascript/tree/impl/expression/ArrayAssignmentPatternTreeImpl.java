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
package org.sonar.javascript.tree.impl.expression;

import com.google.common.base.Function;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import java.util.Optional;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.SeparatedList;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ArrayAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ArrayAssignmentPatternTreeImpl extends JavaScriptTree implements ArrayAssignmentPatternTree {

  private final SyntaxToken openBracketToken;
  private final SeparatedList<Optional<Tree>> elements;
  private final SyntaxToken closeBracketToken;

  public ArrayAssignmentPatternTreeImpl(SyntaxToken openBracketToken, SeparatedList<Optional<Tree>> elements, SyntaxToken closeBracketToken) {
    this.openBracketToken = openBracketToken;
    this.elements = elements;
    this.closeBracketToken = closeBracketToken;
  }

  @Override
  public Kind getKind() {
    return Kind.ARRAY_ASSIGNMENT_PATTERN;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(openBracketToken),
      elements.elementsAndSeparators(new ElidedElementFilter()),
      Iterators.singletonIterator(closeBracketToken)
    );
  }

  @Override
  public SyntaxToken openBracketToken() {
    return openBracketToken;
  }

  @Override
  public SeparatedList<Optional<Tree>> elements() {
    return elements;
  }

  @Override
  public SyntaxToken closeBracketToken() {
    return closeBracketToken;
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitArrayAssignmentPattern(this);
  }

  private static class ElidedElementFilter implements Function<Optional<Tree>, Tree> {

    @Override
    public Tree apply(Optional<Tree> e) {
      return e.orElse(null);
    }

  }
}
