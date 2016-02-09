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
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.ImmutableSetMultimap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.ScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.statement.BlockTree;

public class ControlFlowGraph {

  private final ControlFlowNode start;
  private final ControlFlowNode end = new EndNode();
  private final ImmutableSet<ControlFlowBlock> blocks;
  private final ImmutableSetMultimap<ControlFlowNode, ControlFlowNode> predecessors;
  private final ImmutableSetMultimap<ControlFlowNode, ControlFlowNode> successors;

  ControlFlowGraph(Set<MutableBlock> blocks, MutableBlock start, MutableBlock end) {

    Map<MutableBlock, ControlFlowNode> immutableBlockByMutable = new HashMap<>();
    ImmutableSet.Builder<ControlFlowBlock> immutableBlockSetBuilder = ImmutableSet.builder();
    for (MutableBlock mutableBlock : blocks) {
      ImmutableBlock immutableBlock = new ImmutableBlock(mutableBlock.elements());
      immutableBlockByMutable.put(mutableBlock, immutableBlock);
      immutableBlockSetBuilder.add(immutableBlock);
    }
    immutableBlockByMutable.put(end, this.end);
    
    ImmutableSetMultimap.Builder<ControlFlowNode, ControlFlowNode> successorBuilder = ImmutableSetMultimap.builder();
    ImmutableSetMultimap.Builder<ControlFlowNode, ControlFlowNode> predecessorBuilder = ImmutableSetMultimap.builder();
    for (MutableBlock mutableBlock : blocks) {
      ControlFlowNode immutableBlock = immutableBlockByMutable.get(mutableBlock);
      for (MutableBlock mutableBlockSuccessor : mutableBlock.successors()) {
        ControlFlowNode immutableBlockSuccessor = immutableBlockByMutable.get(mutableBlockSuccessor);
        predecessorBuilder.put(immutableBlockSuccessor, immutableBlock);
        successorBuilder.put(immutableBlock, immutableBlockSuccessor);
      }
    }
    
    this.start = blocks.isEmpty() ? this.end : immutableBlockByMutable.get(start);
    this.blocks = immutableBlockSetBuilder.build();
    this.predecessors = predecessorBuilder.build();
    this.successors = successorBuilder.build();
  }

  public static ControlFlowGraph build(ScriptTree tree) {
    return new ControlFlowGraphBuilder().createGraph(tree);
  }

  public static ControlFlowGraph build(BlockTree body) {
    return new ControlFlowGraphBuilder().createGraph(body);
  }

  public ControlFlowNode start() {
    return start;
  }

  public ControlFlowNode end() {
    return end;
  }

  public Set<ControlFlowBlock> blocks() {
    return blocks;
  }

  private class ImmutableBlock implements ControlFlowBlock {
    
    private final List<Tree> elements;
    
    public ImmutableBlock(List<Tree> elements) {
      Preconditions.checkArgument(!elements.isEmpty(), "Cannot build block without any element");
      this.elements = elements;
    }

    @Override
    public Set<ControlFlowNode> predecessors() {
      return predecessors.get(this);
    }

    @Override
    public Set<ControlFlowNode> successors() {
      return successors.get(this);
    }

    @Override
    public List<Tree> elements() {
      return elements;
    }

  }
  
  private class EndNode implements ControlFlowNode {

    @Override
    public Set<ControlFlowNode> predecessors() {
      return predecessors.get(this);
    }

    @Override
    public Set<ControlFlowNode> successors() {
      return ImmutableSet.of();
    }

    @Override
    public String toString() {
      return "End";
    }
    
  }
  
}
