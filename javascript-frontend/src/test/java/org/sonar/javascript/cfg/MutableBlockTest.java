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

  private static final Tree TREE1 = mock(Tree.class);
  private static final EndBlock END = new EndBlock();
  private static final SimpleBlock SIMPLE1 = new SimpleBlock(END);
  private static final SimpleBlock SIMPLE2 = new SimpleBlock(END);
  private static final BranchingBlock BRANCHING1 = new BranchingBlock(TREE1);

  @Test(expected = IllegalStateException.class)
  public void unset_branch_successors() throws Exception {
    BRANCHING1.successors();
  }

  @Test
  public void branch_successors() throws Exception {
    BRANCHING1.setSuccessors(SIMPLE1, SIMPLE2);
    assertThat(BRANCHING1.successors()).containsOnly(SIMPLE1, SIMPLE2);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_itself_as_successor1() throws Exception {
    BRANCHING1.setSuccessors(BRANCHING1, SIMPLE1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_itself_as_successor2() throws Exception {
    BRANCHING1.setSuccessors(SIMPLE1, BRANCHING1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_set_null_successor1() throws Exception {
    BRANCHING1.setSuccessors(SIMPLE1, null);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_set_null_successor2() throws Exception {
    BRANCHING1.setSuccessors(null, SIMPLE1);
  }

  @Test
  public void simple_successor() throws Exception {
    assertThat(new SimpleBlock(SIMPLE1).successors()).containsOnly(SIMPLE1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_null_as_successor() throws Exception {
    new SimpleBlock(null);
  }

  @Test
  public void non_empty_successor() throws Exception {
    SimpleBlock simpleNonEmpty = new SimpleBlock(END);
    simpleNonEmpty.addElement(TREE1);
    assertThat(simpleNonEmpty.firstNonEmptySuccessor()).isEqualTo(simpleNonEmpty);
    assertThat(new SimpleBlock(simpleNonEmpty).firstNonEmptySuccessor()).isEqualTo(simpleNonEmpty);
    assertThat(new SimpleBlock(BRANCHING1).firstNonEmptySuccessor()).isEqualTo(BRANCHING1);
    assertThat(new SimpleBlock(END).firstNonEmptySuccessor()).isEqualTo(END);
    assertThat(new SimpleBlock(new SimpleBlock(END)).firstNonEmptySuccessor()).isEqualTo(END);
  }

  @Test
  public void end_has_no_successor() throws Exception {
    assertThat(END.successors()).isEmpty();
  }

  @Test(expected = UnsupportedOperationException.class)
  public void cannot_add_element_to_end() throws Exception {
    END.addElement(TREE1);
  }

  @Test(expected = IllegalArgumentException.class)
  public void cannot_add_null_element() throws Exception {
    SIMPLE1.addElement(null);
  }

}
