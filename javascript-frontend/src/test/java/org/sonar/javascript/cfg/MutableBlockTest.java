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

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class MutableBlockTest {

  @Rule
  public ExpectedException thrown = ExpectedException.none();

  private final Tree tree1 = mock(Tree.class);
  private final EndBlock end = new EndBlock();
  private final SimpleBlock simple1 = new SimpleBlock(end);
  private final SimpleBlock simple2 = new SimpleBlock(end);
  private final ForwardingBlock forwarding = new ForwardingBlock();

  @Test
  public void branch_successors() throws Exception {
    BranchingBlock branching = new BranchingBlock(tree1, simple1, simple2);
    assertThat(branching.successors()).containsOnly(simple1, simple2);
    assertThat(branching.trueSuccessor()).isEqualTo(simple1);
    assertThat(branching.falseSuccessor()).isEqualTo(simple2);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_set_null_successor1() throws Exception {
    new BranchingBlock(tree1, simple1, null);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_set_null_successor2() throws Exception {
    new BranchingBlock(tree1, null, simple1);
  }

  @Test
  public void simple_successor() throws Exception {
    SimpleBlock simpleBlock = new SimpleBlock(simple1);
    assertThat(simpleBlock.successors()).containsOnly(simple1);
    assertThat(simpleBlock.trueSuccessor()).isEqualTo(simple1);
    assertThat(simpleBlock.falseSuccessor()).isEqualTo(simple1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_null_as_successor() throws Exception {
    new SimpleBlock(null);
  }

  @Test
  public void non_empty_successor() throws Exception {
    BranchingBlock branching = new BranchingBlock(tree1, simple1, simple2);
    SimpleBlock simpleNonEmpty = new SimpleBlock(end);
    simpleNonEmpty.addElement(tree1);
    assertThat(simpleNonEmpty.skipEmptyBlocks()).isEqualTo(simpleNonEmpty);
    assertThat(new SimpleBlock(simpleNonEmpty).skipEmptyBlocks()).isEqualTo(simpleNonEmpty);
    assertThat(new SimpleBlock(branching).skipEmptyBlocks()).isEqualTo(branching);
    assertThat(new SimpleBlock(end).skipEmptyBlocks()).isEqualTo(end);
    assertThat(new SimpleBlock(new SimpleBlock(end)).skipEmptyBlocks()).isEqualTo(end);
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
    forwarding.successor();
  }

  @Test(expected = UnsupportedOperationException.class)
  public void cannot_add_element_to_forwarding() throws Exception {
    forwarding.addElement(tree1);
  }

  @Test(expected = UnsupportedOperationException.class)
  public void true_successor_is_not_supported_by_end() throws Exception {
    end.trueSuccessor();
  }

  @Test(expected = UnsupportedOperationException.class)
  public void false_successor_is_not_supported_by_end() throws Exception {
    end.falseSuccessor();
  }

  @Test(expected = IllegalArgumentException.class)
  public void canoot_set_null_branching_tree() throws Exception {
    new BranchingBlock(null, simple1, simple2);
  }

}
