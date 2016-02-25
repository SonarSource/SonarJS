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
import java.util.Map;
import java.util.Set;
import org.sonar.plugins.javascript.api.tree.Tree;

/**
 * A {@link MutableBlock} with 2 successors: represents a block ending
 * with a condition which determines which successor is executed next.
 */
class BranchingBlock extends MutableBlock {

  private MutableBlock trueSuccessor = null;
  private MutableBlock falseSuccessor = null;

  public BranchingBlock(Tree element) {
    addElement(element);
  }

  public BranchingBlock() {
    // no element
  }

  @Override
  public Set<MutableBlock> successors() {
    Preconditions.checkState(trueSuccessor != null, "Successors were not set on " + this);
    return ImmutableSet.of(trueSuccessor, falseSuccessor);
  }

  public void setSuccessors(MutableBlock trueSuccessor, MutableBlock falseSuccessor) {
    Preconditions.checkArgument(trueSuccessor != null && falseSuccessor != null, "Successor cannot be null");
    Preconditions.checkArgument(!this.equals(trueSuccessor) && !this.equals(falseSuccessor), "Cannot add itself as successor");
    this.trueSuccessor = trueSuccessor;
    this.falseSuccessor = falseSuccessor;
  }

  @Override
  public void replaceSuccessors(Map<MutableBlock, MutableBlock> replacements) {
    this.trueSuccessor = replacement(this.trueSuccessor, replacements);
    this.falseSuccessor = replacement(this.falseSuccessor, replacements);
  }

  @Override
  public MutableBlock trueSuccessor() {
    return trueSuccessor;
  }

  @Override
  public MutableBlock falseSuccessor() {
    return falseSuccessor;
  }

}
