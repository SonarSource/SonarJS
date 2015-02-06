/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
package org.sonar.javascript.ast.visitors;

import java.util.Iterator;
import java.util.List;

import javax.annotation.Nullable;

import org.sonar.javascript.model.implementations.JavaScriptTree;
import org.sonar.javascript.model.interfaces.Tree;
import org.sonar.javascript.model.interfaces.expression.IdentifierTree;
import org.sonar.javascript.model.interfaces.lexical.SyntaxToken;

import com.google.common.base.Objects;

public final class SyntacticEquivalence {

  private SyntacticEquivalence() {
  }

  /**
   * @return true, if nodes are syntactically equivalent
   */
  public static boolean areEquivalent(List<? extends Tree> leftList, List<? extends Tree> rightList) {
    if (leftList.size() != rightList.size() || leftList.isEmpty()) {
      return false;
    }

    for (int i = 0; i < leftList.size(); i++) {
      Tree left = leftList.get(i);
      Tree right = rightList.get(i);
      if (!areEquivalent(left, right)) {
        return false;
      }
    }
    return true;
  }

  /**
  * @return true, if nodes are syntactically equivalent
  */
  public static boolean areEquivalent(@Nullable Tree leftNode, @Nullable Tree rightNode) {
    return areEquivalent((JavaScriptTree) leftNode, (JavaScriptTree) rightNode);
  }

  private static boolean areEquivalent(@Nullable JavaScriptTree leftNode, @Nullable JavaScriptTree rightNode) {
    if (leftNode == rightNode) {
      return true;
    }
    if (leftNode == null || rightNode == null) {
      return false;
    }
    if (leftNode.getKind() != rightNode.getKind()) {
      return false;
    } else if (leftNode.isLeaf()) {
      return areLeafsEquivalent(leftNode, rightNode);
    }

    Iterator<Tree> iteratorA = leftNode.childrenIterator();
    Iterator<Tree> iteratorB = rightNode.childrenIterator();

    while (iteratorA.hasNext() && iteratorB.hasNext()) {
      if (!areEquivalent(iteratorA.next(), iteratorB.next())) {
        return false;
      }
    }

    return !iteratorA.hasNext() && !iteratorB.hasNext();
  }

  /**
   * Caller must guarantee that nodes of the same kind.
   */
  private static boolean areLeafsEquivalent(JavaScriptTree leftNode, JavaScriptTree rightNode) {
    if (leftNode instanceof IdentifierTree) {
      return Objects.equal(((IdentifierTree) leftNode).name(), ((IdentifierTree) rightNode).name());
    } else if (leftNode instanceof SyntaxToken) {
      return Objects.equal(((SyntaxToken) leftNode).text(), ((SyntaxToken) rightNode).text());
    } else {
      throw new IllegalArgumentException();
    }
  }

}
