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
package org.sonar.javascript.tree.impl;

import java.util.Iterator;
import java.util.Objects;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Kinds;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

public abstract class JavaScriptTree implements Tree {

  private JavaScriptTree parent;

  @Override
  public final boolean is(Kinds... kind) {
    if (getKind() != null) {
      for (Kinds kindIter : kind) {
        if (kindIter.contains(getKind())) {
          return true;
        }
      }
    }
    return false;
  }

  public abstract Kind getKind();

  /**
   * Creates iterator for children of this node.
   * Note that iterator may contain {@code null} elements.
   *
   * @throws UnsupportedOperationException if {@link #isLeaf()} returns {@code true}
   */
  public abstract Iterator<Tree> childrenIterator();

  public boolean isLeaf() {
    return false;
  }

  @Override
  public SyntaxToken lastToken() {
    SyntaxToken lastToken = null;
    Iterator<Tree> childrenIterator = childrenIterator();
    while (childrenIterator.hasNext()) {
      JavaScriptTree child = (JavaScriptTree) childrenIterator.next();
      if (child != null) {
        SyntaxToken childLastToken = child.lastToken();
        if (childLastToken != null) {
          lastToken = childLastToken;
        }
      }
    }
    return lastToken;
  }

  @Override
  public SyntaxToken firstToken() {
    Iterator<Tree> childrenIterator = childrenIterator();
    Tree child;
    do {
      if (childrenIterator.hasNext()) {
        child = childrenIterator.next();
      } else {
        throw new IllegalStateException("Tree has no non-null children " + getKind());
      }
    } while (child == null);
    return child.firstToken();
  }

  @Override
  public boolean isAncestorOf(Tree tree) {
    Tree parentTree = tree.parent();
    if (this.equals(parentTree)) {
      return true;
    }
    if (parentTree == null) {
      return false;
    }
    return this.isAncestorOf(parentTree);
  }

  @Override
  public Stream<JavaScriptTree> descendants() {
    if (this.isLeaf()) {
      return Stream.empty();
    }
    Stream<JavaScriptTree> kins = childrenStream().filter(Objects::nonNull)
      .filter(tree -> tree instanceof JavaScriptTree)
      .map(tree -> (JavaScriptTree) tree);
    for (Iterator<Tree> iterator = this.childrenIterator(); iterator.hasNext();) {
      Tree tree = iterator.next();
      if (tree != null) {
        kins = Stream.concat(kins, tree.descendants());
      }
    }
    return kins;
  }

  @Override
  public Stream<Tree> childrenStream() {
    return StreamSupport.stream(Spliterators.spliteratorUnknownSize(childrenIterator(), Spliterator.ORDERED), false);
  }

  public void setParent(Tree parent) {
    this.parent = (JavaScriptTree) parent;
  }

  @Override
  public Tree parent() {
    return parent;
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    Iterator<Tree> children = childrenIterator();
    while (children.hasNext()) {
      sb.append(children.next());
      sb.append(" ");
    }
    return sb.toString();
  }
}
