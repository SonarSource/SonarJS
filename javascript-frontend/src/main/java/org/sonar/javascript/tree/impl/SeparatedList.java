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
package org.sonar.javascript.tree.impl;

import com.google.common.base.Function;
import com.google.common.base.Preconditions;
import com.google.common.collect.UnmodifiableIterator;
import java.util.Iterator;
import java.util.List;
import org.sonar.javascript.tree.impl.lexical.InternalSyntaxToken;
import org.sonar.plugins.javascript.api.tree.Tree;

public class SeparatedList<T> {

  private final List<T> elements;

  private final List<InternalSyntaxToken> separators;

  public SeparatedList(List<T> list, List<InternalSyntaxToken> separators) {
    Preconditions.checkArgument(
      list.size() == separators.size() + 1 || list.size() == separators.size(),
      "Instanciating a SeparatedList with inconsistent number of elements (%s) and separators (%s)",
      list.size(), separators.size());
    this.elements = list;
    this.separators = separators;
  }

  public List<T> elements() {
    return elements;
  }

  public InternalSyntaxToken separator(int i) {
    return separators.get(i);
  }

  public List<InternalSyntaxToken> separators() {
    return separators;
  }

  public int size() {
    return elements.size();
  }

  public boolean isEmpty() {
    return elements.isEmpty();
  }

  public void add(T e) {
    if (elements.size() != separators.size()) {
      throw new IllegalArgumentException(
        "Cannot add element to " + SeparatedList.class.getSimpleName() + " with " + elements.size() + " elements and " + separators.size() + " separators");
    }
    elements.add(e);
  }

  public T get(int index) {
    return elements.get(index);
  }

  public Iterator<Tree> elementsAndSeparators(final Function<T, ? extends Tree> elementTransformer) {
    return new ElementAndSeparatorIterator(elementTransformer);
  }

  private final class ElementAndSeparatorIterator extends UnmodifiableIterator<Tree> {

    private final Function<T, ? extends Tree> elementTransformer;
    private final Iterator<T> elementIterator = elements.iterator();
    private final Iterator<InternalSyntaxToken> separatorIterator = separators.iterator();
    private boolean nextIsElement = true;

    private ElementAndSeparatorIterator(Function<T, ? extends Tree> elementTransformer) {
      this.elementTransformer = elementTransformer;
    }

    @Override
    public boolean hasNext() {
      return elementIterator.hasNext() || separatorIterator.hasNext();
    }

    @Override
    public Tree next() {
      Tree next = nextIsElement ? elementTransformer.apply(elementIterator.next()) : separatorIterator.next();
      nextIsElement = !nextIsElement;
      return next;
    }
  }

}
