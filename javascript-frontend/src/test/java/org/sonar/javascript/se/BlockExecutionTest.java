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
package org.sonar.javascript.se;

import org.junit.Test;
import org.sonar.javascript.cfg.CfgBlock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class BlockExecutionTest {

  private CfgBlock block1 = mock(CfgBlock.class);
  private CfgBlock block2 = mock(CfgBlock.class);
  private ProgramState state1 = mock(ProgramState.class);
  private ProgramState state2 = mock(ProgramState.class);

  @Test
  public void constructor() throws Exception {
    assertThat(new BlockExecution(block1, state1).block()).isEqualTo(block1);
    assertThat(new BlockExecution(block1, state1).state()).isEqualTo(state1);
  }

  @Test
  public void test_equals() throws Exception {
    assertThat(new BlockExecution(block1, state1)).isNotEqualTo(null);
    assertThat(new BlockExecution(block1, state1)).isNotEqualTo("");
    assertThat(new BlockExecution(block1, state1)).isNotEqualTo(new BlockExecution(block2, state1));
    assertThat(new BlockExecution(block1, state1)).isNotEqualTo(new BlockExecution(block1, state2));
    assertThat(new BlockExecution(block1, state1)).isEqualTo(new BlockExecution(block1, state1));
  }

  @Test
  public void test_hashCode() throws Exception {
    assertThat(new BlockExecution(block1, state1).hashCode()).isEqualTo(new BlockExecution(block1, state1).hashCode());
  }

}
