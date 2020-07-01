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

import com.google.common.collect.ImmutableSet;
import java.util.Map;
import org.sonar.plugins.javascript.api.tree.Tree;

class JsCfgBranchingBlock extends JsCfgBlock implements CfgBranchingBlock {

  private JsCfgBlock trueSuccessor;
  private JsCfgBlock falseSuccessor;

  private Tree branchingTree;

  public JsCfgBranchingBlock(Tree branchingTree, JsCfgBlock trueSuccessor, JsCfgBlock falseSuccessor) {
    this.trueSuccessor = trueSuccessor;
    this.falseSuccessor = falseSuccessor;
    this.branchingTree = branchingTree;
  }

  @Override
  public JsCfgBlock trueSuccessor() {
    return trueSuccessor;
  }

  @Override
  public JsCfgBlock falseSuccessor() {
    return falseSuccessor;
  }

  @Override
  public Tree branchingTree() {
    return branchingTree;
  }

  @Override
  public ImmutableSet<CfgBlock> successors() {
    return ImmutableSet.<CfgBlock>of(trueSuccessor, falseSuccessor);
  }

  @Override
  public void replaceSuccessors(Map<JsCfgBlock, JsCfgBlock> replacements) {
    this.trueSuccessor = replacement(this.trueSuccessor, replacements);
    this.falseSuccessor = replacement(this.falseSuccessor, replacements);
  }
}
