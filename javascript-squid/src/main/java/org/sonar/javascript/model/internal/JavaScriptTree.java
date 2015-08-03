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

import com.google.common.base.Preconditions;
import com.sonar.sslr.api.AstNode;
import com.sonar.sslr.api.AstNodeType;
import com.sonar.sslr.api.Token;
import com.sonar.sslr.impl.typed.AstNodeReflector;
import org.sonar.plugins.javascript.api.tree.Tree;

import javax.annotation.Nullable;
import java.util.Iterator;
import java.util.List;

public abstract class JavaScriptTree extends AstNode implements Tree {

  private static final AstNodeType NULL_NODE = new AstNodeType() {

    @Override
    public String toString() {
      return "[null]";
    }

  };

  private final AstNode astNode;

  public JavaScriptTree(AstNodeType type) {
    super(type, type.toString(), null);
    this.astNode = this;
  }

  public JavaScriptTree(AstNodeType type, Token token) {
    super(type, type.toString(), token);
    this.astNode = this;
  }

  public JavaScriptTree(@Nullable AstNode astNode) {
    super(
      astNode == null ? NULL_NODE : astNode.getType(),
      astNode == null ? NULL_NODE.toString() : astNode.getType().toString(),
      astNode == null ? null : astNode.getToken());
    this.astNode = astNode;
  }

  public boolean isLegacy() {
    return astNode != this;
  }

  private void prependChild(AstNode astNode) {
    Preconditions.checkState(getAstNode() == this, "Legacy strongly typed node");

    List<AstNode> children = getChildren();
    if (children.isEmpty()) {
      // addChild() will take care of everything
      addChild(astNode);
    } else {
      AstNodeReflector.setParent(astNode, this);
      children.add(0, astNode);

      // Reset the childIndex field of all children
      for (int i = 0; i < children.size(); i++) {
        AstNodeReflector.setChildIndex(children.get(i), i);
      }
    }
  }

  public void prependChildren(AstNode... astNodes) {
    for (int i = astNodes.length - 1; i >= 0; i--) {
      prependChild(astNodes[i]);
    }
  }

  public void prependChildren(List<? extends AstNode> astNodes) {
    prependChildren(astNodes.toArray(new AstNode[astNodes.size()]));
  }

  @Override
  public void addChild(AstNode child) {
    Preconditions.checkState(!isLegacy(), "Children should not be added to legacy nodes");
    super.addChild(child);
  }

  public void addChildren(AstNode... children) {
    Preconditions.checkState(!isLegacy(), "Children should not be added to legacy nodes");

    for (AstNode child: children) {
      super.addChild(child);
    }
  }

  public AstNode getAstNode() {
    return astNode;
  }

  public int getLine() {
    return astNode.getTokenLine();
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

  public abstract AstNodeType getKind();

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
}
