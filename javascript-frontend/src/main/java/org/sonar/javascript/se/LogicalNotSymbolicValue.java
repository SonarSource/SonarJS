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

import com.google.common.base.Preconditions;
import java.util.List;

public class LogicalNotSymbolicValue implements SymbolicValue {

  private final SymbolicValue negatedValue;

  public LogicalNotSymbolicValue(SymbolicValue negatedValue) {
    Preconditions.checkArgument(negatedValue != null, "negatedValue should not be null");
    this.negatedValue = negatedValue;
  }

  @Override
  public List<ProgramState> constrain(ProgramState state, Constraint constraint) {
    return negatedValue.constrain(state, constraint.not());
  }

  @Override
  public String toString() {
    return "!" + negatedValue;
  }

}
