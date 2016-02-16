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

  private MutableBlock successor1 = null;
  private MutableBlock successor2 = null;

  public BranchingBlock(Tree element) {
    addElement(element);
  }

  @Override
  public Set<MutableBlock> successors() {
    Preconditions.checkState(successor1 != null, "Successors were not set on " + this);
    return ImmutableSet.of(successor1, successor2);
  }

  public void setSuccessors(MutableBlock successor1, MutableBlock successor2) {
    Preconditions.checkArgument(successor1 != null && successor2 != null, "Successor cannot be null");
    Preconditions.checkArgument(successor1 != this && successor2 != this, "Cannot add itself as successor");
    this.successor1 = successor1;
    this.successor2 = successor2;
  }

  @Override
  public void replaceSuccessors(Map<MutableBlock, MutableBlock> replacements) {
    this.successor1 = replacement(this.successor1, replacements);
    this.successor2 = replacement(this.successor2, replacements);
  }

}
