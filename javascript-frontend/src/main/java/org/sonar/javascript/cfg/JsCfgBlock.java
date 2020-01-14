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
package org.sonar.javascript.cfg;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableSet;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;

class JsCfgBlock implements CfgBlock {

  private Set<JsCfgBlock> predecessors = new HashSet<>();
  private JsCfgBlock successor;

  private LinkedList<Tree> elements = new LinkedList<>();

  private final Set<SyntaxToken> disconnectingJumps = new HashSet<>();

  JsCfgBlock(JsCfgBlock successor) {
    Preconditions.checkArgument(successor != null, "Successor cannot be null");
    this.successor = successor;
  }

  JsCfgBlock() {
  }

  @Override
  public Set<CfgBlock> predecessors() {
    return Collections.<CfgBlock>unmodifiableSet(predecessors);
  }

  @Override
  public Set<CfgBlock> successors() {
    return ImmutableSet.<CfgBlock>of(successor);
  }

  @Override
  public List<Tree> elements() {
    return Collections.unmodifiableList(elements);
  }

  public void addElement(Tree element) {
    Preconditions.checkArgument(element != null, "Cannot add a null element to a block");
    elements.addFirst(element);
  }

  void addPredecessor(JsCfgBlock predecessor) {
    this.predecessors.add(predecessor);
  }

  /**
   * Replace successors based on a replacement map.
   * This method is used when we remove empty blocks:
   * we have to replace empty successors in the remaining blocks by non-empty successors.
   */
  public void replaceSuccessors(Map<JsCfgBlock, JsCfgBlock> replacements) {
    this.successor = replacement(successor, replacements);
  }

  static JsCfgBlock replacement(JsCfgBlock successor, Map<JsCfgBlock, JsCfgBlock> replacements) {
    JsCfgBlock newSuccessor = replacements.get(successor);
    return newSuccessor == null ? successor : newSuccessor;
  }

  /**
   * Jump keywords (return, throw, break continue) which disconnect normal execution flow coming to this block.
   */
  Set<SyntaxToken> disconnectingJumps() {
    return disconnectingJumps;
  }

  void addDisconnectingJump(SyntaxToken jumpToken) {
    disconnectingJumps.add(jumpToken);
  }

  JsCfgBlock skipEmptyBlocks() {
    Set<CfgBlock> skippedBlocks = new HashSet<>();
    JsCfgBlock block = this;
    while (block.successors().size() == 1 && block.elements().isEmpty()) {
      JsCfgBlock next = (JsCfgBlock) block.successors().iterator().next();
      skippedBlocks.add(block);
      if (!skippedBlocks.contains(next)) {
        block = next;
      } else {
        return block;
      }
    }
    return block;
  }
}
