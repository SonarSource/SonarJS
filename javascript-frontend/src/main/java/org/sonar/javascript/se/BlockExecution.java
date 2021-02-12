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

import java.util.Objects;
import org.sonar.javascript.cfg.CfgBlock;

/**
 * This class represents execution of a block on a given path
 */
public class BlockExecution {

  private final CfgBlock block;
  private final ProgramState state;

  public BlockExecution(CfgBlock block, ProgramState state) {
    this.block = block;
    this.state = state;
  }

  @Override
  public int hashCode() {
    return Objects.hash(block, state);
  }

  @Override
  public boolean equals(Object obj) {
    if (obj == null || getClass() != obj.getClass()) {
      return false;
    }
    BlockExecution other = (BlockExecution) obj;
    return Objects.equals(this.block, other.block) && Objects.equals(this.state, other.state);
  }

  public CfgBlock block() {
    return block;
  }

  public ProgramState state() {
    return state;
  }
}
