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

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.lexical.SyntaxToken;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;

/**
 * The <a href="https://en.wikipedia.org/wiki/Control_flow_graph">Control Flow Graph</a>
 * for a JavaScript script or for the body of a function.
 *
 * <p>Each node of the graph represents a list of elements which are executed one after the other.
 * Each node has:
 * <ul>
 * <li>one ore more successor blocks,</li>
 * <li>zero or more predecessor blocks.</li>
 * </ul>
 * </p>
 *
 * A Control Flow Graph has a single start node and a single end node.
 * The end node has no successor and no element.
 *
 */
public class ControlFlowGraph {

  private final CfgBlock start;
  private final JsCfgEndBlock end;
  private final Set<JsCfgBlock> blocks;

  ControlFlowGraph(Set<JsCfgBlock> blocks, CfgBlock start, JsCfgEndBlock end) {
    this.start = start;
    this.end = end;
    this.blocks = blocks;

    for (JsCfgBlock block : blocks) {
      for (CfgBlock successor : block.successors()) {
        ((JsCfgBlock) successor).addPredecessor(block);
      }
    }
  }

  public static ControlFlowGraph build(ScriptTree tree) {
    return new ControlFlowGraphBuilder().createGraph(tree);
  }

  public static ControlFlowGraph build(BlockTree body) {
    return new ControlFlowGraphBuilder().createGraph(body);
  }

  public CfgBlock start() {
    return start;
  }

  public CfgBlock end() {
    return end;
  }

  public Set<CfgBlock> blocks() {
    return Collections.<CfgBlock>unmodifiableSet(blocks);
  }

  public Set<CfgBlock> unreachableBlocks() {
    Set<CfgBlock> unreachable = new HashSet<>();
    for (CfgBlock block : blocks) {
      if (!block.equals(start) && block.predecessors().isEmpty()) {
        unreachable.add(block);
      }
    }
    return unreachable;
  }

  public Set<SyntaxToken> disconnectingJumps(CfgBlock block) {
    return ((JsCfgBlock) block).disconnectingJumps();
  }

  static CfgBlock trueSuccessorFor(CfgBlock block) {
    if (block instanceof CfgBranchingBlock) {
      return ((JsCfgBranchingBlock) block).trueSuccessor();
    } else {
      return block.successors().iterator().next();
    }
  }

  static CfgBlock falseSuccessorFor(CfgBlock block) {
    if (block instanceof CfgBranchingBlock) {
      return ((JsCfgBranchingBlock) block).falseSuccessor();
    } else {
      return block.successors().iterator().next();
    }
  }

}
