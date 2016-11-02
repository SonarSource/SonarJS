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
import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

/**
 * This class represents symbolic value for binary "+" expression.
 * E.g.
 * <pre>x + y</pre>
 * <pre>"str" + foo</pre>
 */
public class PlusSymbolicValue implements SymbolicValue {

  private final SymbolicValue firstOperandValue;
  private final SymbolicValue secondOperandValue;

  public PlusSymbolicValue(SymbolicValue firstOperandValue, SymbolicValue secondOperandValue) {
    Preconditions.checkArgument(firstOperandValue != null, "operand value should not be null");
    Preconditions.checkArgument(secondOperandValue != null, "operand value should not be null");
    this.firstOperandValue = firstOperandValue;
    this.secondOperandValue = secondOperandValue;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    Constraint numberOrBoolean = Constraint.NUMBER_PRIMITIVE.or(Constraint.BOOLEAN_PRIMITIVE);

    Constraint firstConstraint = state.getConstraint(firstOperandValue);
    Constraint secondConstraint = state.getConstraint(secondOperandValue);

    if (firstConstraint.isStricterOrEqualTo(Constraint.ANY_STRING) || secondConstraint.isStricterOrEqualTo(Constraint.ANY_STRING)) {
      return Constraint.STRING_PRIMITIVE;

    } else if (firstConstraint.isStricterOrEqualTo(numberOrBoolean) && secondConstraint.isStricterOrEqualTo(numberOrBoolean)) {
      return Constraint.NUMBER_PRIMITIVE;
    }
    return Constraint.NUMBER_PRIMITIVE.or(Constraint.STRING_PRIMITIVE);
  }

  @Override
  public String toString() {
    return firstOperandValue + " + " + secondOperandValue;
  }
}
