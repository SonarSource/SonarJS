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
package org.sonar.javascript.cfg;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.sonar.javascript.utils.SourceBuilder;

import com.google.common.base.Joiner;

public class CfgPrinter {

  public static String toDot(ControlFlowGraph cfg) {
    StringBuilder sb = new StringBuilder();
    int blockId = 0;
    Map<CfgBlock, Integer> blockIds = new HashMap<>();
    for (CfgBlock block : cfg.blocks()) {
      blockIds.put(block, blockId);
      blockId++;
    }
    sb.append("cfg{");
    for (CfgBlock block : cfg.blocks()) {
      int id = blockIds.get(block);
      sb.append(id + "[label=\"" + blockLabel(cfg, block) + "\"];");
    }
    for (CfgBlock block : cfg.blocks()) {
      int id = blockIds.get(block);
      Set<CfgBlock> successors = block.successors();
      for (CfgBlock successor : successors) {
        String edgeLabel = "";
        if (block instanceof JsCfgBranchingBlock) {
          JsCfgBranchingBlock branching = (JsCfgBranchingBlock) block;
          edgeLabel = "[label=" + Boolean.toString(successor.equals(branching.trueSuccessor())) + "]";
        }
        sb.append(id + "->" + blockIds.get(successor) + edgeLabel + ";");
      }
    }
    sb.append("}");

    return sb.toString();
  }

  private static String blockLabel(ControlFlowGraph cfg, CfgBlock block) {
    if (cfg.end().equals(block)) {
      return "<END>";
    }
    List<String> elementSources = block.elements().stream()
      .map(e -> SourceBuilder.build(e).trim().replaceAll("\\s+", " "))
      .collect(Collectors.toList());
    return Joiner.on("\\n").join(elementSources);
  }

}
