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

import com.google.common.base.Functions;
import com.google.common.collect.Iterators;
import java.util.Iterator;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.javascript.tree.impl.SeparatedList;
import org.sonar.plugins.javascript.api.symbols.TypeSet;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.ObjectAssignmentPatternTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.visitors.DoubleDispatchVisitor;

public class ObjectAssignmentPatternTreeImpl extends JavaScriptTree implements ObjectAssignmentPatternTree {


  private final SyntaxToken openBraceToken;
  private final SeparatedList<Tree> elements;
  private final SyntaxToken closeBraceToken;

  public ObjectAssignmentPatternTreeImpl(SyntaxToken openBraceToken, SeparatedList<Tree> elements, SyntaxToken closeBraceToken) {
    this.openBraceToken = openBraceToken;
    this.elements = elements;
    this.closeBraceToken = closeBraceToken;
  }

  @Override
  public Kind getKind() {
    return Kind.OBJECT_ASSIGNMENT_PATTERN;
  }

  @Override
  public Iterator<Tree> childrenIterator() {
    return Iterators.concat(
      Iterators.singletonIterator(openBraceToken),
      elements.elementsAndSeparators(Functions.identity()),
      Iterators.singletonIterator(closeBraceToken));
  }

  @Override
  public SyntaxToken openBraceToken() {
    return openBraceToken;
  }

  @Override
  public SeparatedList<Tree> elements() {
    return elements;
  }

  @Override
  public SyntaxToken closeBraceToken() {
    return closeBraceToken;
  }

  @Override
  public TypeSet types() {
    return TypeSet.emptyTypeSet();
  }

  @Override
  public void accept(DoubleDispatchVisitor visitor) {
    visitor.visitObjectAssignmentPattern(this);
  }
}
