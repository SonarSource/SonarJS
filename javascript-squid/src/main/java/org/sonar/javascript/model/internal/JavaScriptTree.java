/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.model.internal;

import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

import java.util.Iterator;

public abstract class JavaScriptTree implements Tree {

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
}
