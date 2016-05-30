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
package org.sonar.javascript.se;

import com.google.common.collect.ImmutableList;
import java.util.List;

public class SimpleSymbolicValue implements SymbolicValue {

  private final int id;

  SimpleSymbolicValue(int id) {
    this.id = id;
  }

  @Override
  public String toString() {
    return "SV_" + id;
  }

  public List<ProgramState> constrain(ProgramState state, Constraint constraint) {
    ProgramState newState = state.constrain(this, constraint);
    if (newState == null) {
      return ImmutableList.of();
    }
    return ImmutableList.of(newState);
  }


}
