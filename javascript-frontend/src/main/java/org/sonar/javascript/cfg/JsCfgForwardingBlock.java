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
import java.util.Map;
import org.sonar.plugins.javascript.api.tree.Tree;

/**
 * A {@link JsCfgBlock} which has exactly one successor and which has no element.
 * This is used only to build some special flows, e.g. an infinite {@code for} loop.
 */
class JsCfgForwardingBlock extends JsCfgBlock {

  private JsCfgBlock successor;

  @Override
  public ImmutableSet<CfgBlock> successors() {
    Preconditions.checkState(successor != null, "No successor was set on %s", this);
    return ImmutableSet.<CfgBlock>of(successor);
  }

  @Override
  public void addElement(Tree element) {
    throw new UnsupportedOperationException("Cannot add an element to a forwarding block");
  }

  void setSuccessor(JsCfgBlock successor) {
    this.successor = successor;
  }

  @Override
  public void replaceSuccessors(Map<JsCfgBlock, JsCfgBlock> replacements) {
    this.successor = replacement(successor, replacements);
  }
}
