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
package org.sonar.javascript.se.sv;

import com.google.common.base.Preconditions;
import java.util.List;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

public class LogicalNotSymbolicValue implements SymbolicValue {

  private final SymbolicValue negatedValue;

  private LogicalNotSymbolicValue(SymbolicValue negatedValue) {
    Preconditions.checkArgument(negatedValue != null, "negatedValue should not be null");
    this.negatedValue = negatedValue;
  }

  public static SymbolicValue create(SymbolicValue negatedValue) {
    return new LogicalNotSymbolicValue(negatedValue);
  }

  @Override
  public List<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return state.constrain(negatedValue, constraint.not());
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    Constraint negatedConstraint = state.getConstraint(negatedValue);
    if (negatedConstraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
      return Constraint.FALSE;
    }
    if (negatedConstraint.isStricterOrEqualTo(Constraint.FALSY)) {
      return Constraint.TRUE;
    }
    return Constraint.BOOLEAN;
  }

  @Override
  public String toString() {
    return "!" + negatedValue;
  }

}
