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
package org.sonar.javascript.cfg;

import com.google.common.base.Preconditions;
import com.google.common.collect.Lists;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

/**
 * Mutable block used when building a {@link ControlFlowGraph}.
 * It has successors (except if it's the end node) but has no reference to predecessors.
 */
abstract class MutableBlock {
  
  private final List<Tree> elements = new ArrayList<>();
  private final Set<SyntaxToken> disconnectingJumps = new HashSet<>();

  public abstract Set<MutableBlock> successors();
  
  /**
   * Replace successors based on a replacement map.
   * This method is used when we remove empty blocks:
   * we have to replace empty successors in the remaining blocks by non-empty successors.
   */
  public abstract void replaceSuccessors(Map<MutableBlock, MutableBlock> replacements);

  public List<Tree> elements() {
    return Lists.reverse(elements);
  }

  public void addElement(Tree element) {
    Preconditions.checkArgument(element != null, "Cannot add a null element to a block");
    elements.add(element);
  }

  public boolean isEmpty() {
    return elements.isEmpty();
  }

  static MutableBlock replacement(MutableBlock successor, Map<MutableBlock, MutableBlock> replacements) {
    MutableBlock newSuccessor = replacements.get(successor);
    return newSuccessor == null ? successor : newSuccessor;
  }

  /**
   * Jump keywords (return, throw, break continue) which disconnect normal execution flow coming to this block.
   */
  public Set<SyntaxToken> disconnectingJumps() {
    return disconnectingJumps;
  }

  public void addDisconnectingJump(SyntaxToken jumpToken) {
    disconnectingJumps.add(jumpToken);
  }

}
