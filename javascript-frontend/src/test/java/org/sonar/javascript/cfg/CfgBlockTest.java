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

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class CfgBlockTest {

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  private final Tree tree1 = mock(Tree.class);
  private final JsCfgEndBlock end = new JsCfgEndBlock();
  private final JsCfgBlock simple1 = new JsCfgBlock(end);
  private final JsCfgBlock simple2 = new JsCfgBlock(end);
  private final JsCfgForwardingBlock forwarding = new JsCfgForwardingBlock();

  @Test
  public void branch_successors() throws Exception {
    JsCfgBranchingBlock branching = new JsCfgBranchingBlock(tree1, simple1, simple2);
    assertThat(branching.successors()).containsOnly(simple1, simple2);
    assertThat(branching.trueSuccessor()).isEqualTo(simple1);
    assertThat(branching.falseSuccessor()).isEqualTo(simple2);
  }

  @Test
  public void simple_successor() throws Exception {
    JsCfgBlock simpleBlock = new JsCfgBlock(simple1);
    assertThat(simpleBlock.successors()).containsOnly(simple1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_null_as_successor() throws Exception {
    new JsCfgBlock(null);
  }

  @Test
  public void non_empty_successor() throws Exception {
    JsCfgBranchingBlock branching = new JsCfgBranchingBlock(tree1, simple1, simple2);
    JsCfgBlock simpleNonEmpty = new JsCfgBlock(end);
    simpleNonEmpty.addElement(tree1);
    assertThat(simpleNonEmpty.skipEmptyBlocks()).isEqualTo(simpleNonEmpty);
    assertThat(new JsCfgBlock(simpleNonEmpty).skipEmptyBlocks()).isEqualTo(simpleNonEmpty);
    assertThat(new JsCfgBlock(branching).skipEmptyBlocks()).isEqualTo(branching);
    assertThat(new JsCfgBlock(end).skipEmptyBlocks()).isEqualTo(end);
    assertThat(new JsCfgBlock(new JsCfgBlock(end)).skipEmptyBlocks()).isEqualTo(end);
  }

  @Test(timeout = 1000)
  public void stop_skipping_if_in_a_loop_of_empty_blocks() throws Exception {
    JsCfgForwardingBlock forwarding = new JsCfgForwardingBlock();
    JsCfgBlock empty = new JsCfgBlock(forwarding);
    forwarding.setSuccessor(empty);
    assertThat(empty.skipEmptyBlocks()).isEqualTo(forwarding);
    JsCfgBlock start = new JsCfgBlock(empty);
    assertThat(start.skipEmptyBlocks()).isEqualTo(forwarding);
  }

  @Test
  public void end_has_no_successor() throws Exception {
    assertThat(end.successors()).isEmpty();
  }

  @Test(expected = UnsupportedOperationException.class)
  public void cannot_add_element_to_end() throws Exception {
    end.addElement(tree1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_null_element() throws Exception {
    simple1.addElement(null);
  }

  @Test(expected = IllegalStateException.class)
  public void forwarding_with_no_successor() throws Exception {
    forwarding.successors();
  }

  @Test(expected = UnsupportedOperationException.class)
  public void cannot_add_element_to_forwarding() throws Exception {
    forwarding.addElement(tree1);
  }

}
