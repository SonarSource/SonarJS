/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Usage;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

public abstract class JavaScriptTree implements Tree {

  private Tree parent;

  public int getLine() {
    return getFirstToken().line();
  }

  @Override
  public final boolean is(Kind... kind) {
    if (getKind() != null) {
      for (Kind kindIter : kind) {
        if (getKind() == kindIter) {
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

  public SyntaxToken getLastToken() {
    SyntaxToken lastToken = null;
    Iterator<Tree> childrenIterator = childrenIterator();
    while (childrenIterator.hasNext()) {
      JavaScriptTree child = (JavaScriptTree) childrenIterator.next();
      if (child != null) {
        SyntaxToken childLastToken = child.getLastToken();
        if (childLastToken != null) {
          lastToken = childLastToken;
        }
      }
    }
    return lastToken;
  }

  public SyntaxToken getFirstToken() {
    Iterator<Tree> childrenIterator = childrenIterator();
    Tree child;
    do {
      if (childrenIterator.hasNext()) {
        child = childrenIterator.next();
      } else {
        throw new IllegalStateException("Tree has no non-null children " + getKind());
      }
    } while (child == null);
    return ((JavaScriptTree) child).getFirstToken();
  }

  public Stream<Symbol> allSymbols() {
    return thisAndKin().filter(tree -> tree instanceof IdentifierTree)
      .map(tree -> (IdentifierTree) tree)
      .filter(identifierTree -> identifierTree.symbol() != null)
      .map(IdentifierTree::symbol);
  }

  public Stream<Usage> allSymbolsUsages() {
    return allSymbols().flatMap(symbol -> symbol.usages().stream()).filter(usage -> this.isAncestorOf((JavaScriptTree) usage.identifierTree()));
  }

  public boolean isAncestorOf(JavaScriptTree tree) {
    Tree parentTree = tree.getParent();
    if (this.equals(parentTree)) {
      return true;
    }
    if (parentTree instanceof JavaScriptTree) {
      return this.isAncestorOf((JavaScriptTree) parentTree);
    }
    return false;
  }

  public Stream<JavaScriptTree> thisAndKin() {
    return Stream.concat(Stream.<JavaScriptTree>builder().add(this).build(), kin());
  }

  public Stream<JavaScriptTree> kin() {
    if (this.isLeaf()) {
      return Stream.empty();
    }
    Stream<JavaScriptTree> kins = childrenStream().filter(Objects::nonNull)
      .filter(tree -> tree instanceof JavaScriptTree)
      .map(tree -> (JavaScriptTree) tree);
    for (Iterator<Tree> iterator = this.childrenIterator(); iterator.hasNext();) {
      Tree tree = iterator.next();
      if (tree != null) {
        kins = Stream.concat(kins, ((JavaScriptTree) tree).kin());
      }
    }
    return kins;
  }

  private Stream<Tree> childrenStream() {
    return StreamSupport.stream(Spliterators.spliteratorUnknownSize(childrenIterator(), Spliterator.ORDERED), false);
  }

  public void setParent(Tree parent) {
    this.parent = parent;
  }

  public Tree getParent() {
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
