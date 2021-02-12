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
package org.sonar.javascript.se.sv;

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

  private static final Constraint NUMBER_OR_BOOLEAN = Constraint.ANY_NUMBER.or(Constraint.ANY_BOOLEAN);

  private final SymbolicValue firstOperandValue;
  private final SymbolicValue secondOperandValue;

  public PlusSymbolicValue(SymbolicValue firstOperandValue, SymbolicValue secondOperandValue) {
    this.firstOperandValue = firstOperandValue;
    this.secondOperandValue = secondOperandValue;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {

    Constraint firstConstraint = state.getConstraint(firstOperandValue);
    Constraint secondConstraint = state.getConstraint(secondOperandValue);

    if (atLeastOneUndefined(firstConstraint, secondConstraint) &&
        (atLeastOneNumberOrBoolean(firstConstraint, secondConstraint) || bothUndefined(firstConstraint, secondConstraint))) {
      return Constraint.NAN;
    }

    if (atLeastOneString(firstConstraint, secondConstraint)) {
      return Constraint.STRING_PRIMITIVE;

    } else if (bothNumberOrBoolean(firstConstraint, secondConstraint)) {
      return Constraint.NUMBER_PRIMITIVE;

    }

    return Constraint.NUMBER_PRIMITIVE.or(Constraint.STRING_PRIMITIVE);
  }

  private static boolean bothUndefined(Constraint firstConstraint, Constraint secondConstraint) {
    return firstConstraint.isStricterOrEqualTo(Constraint.UNDEFINED) && secondConstraint.isStricterOrEqualTo(Constraint.UNDEFINED);
  }

  private static boolean atLeastOneString(Constraint firstConstraint, Constraint secondConstraint) {
    return firstConstraint.isStricterOrEqualTo(Constraint.ANY_STRING) || secondConstraint.isStricterOrEqualTo(Constraint.ANY_STRING);
  }

  private static boolean atLeastOneUndefined(Constraint firstConstraint, Constraint secondConstraint) {
    return firstConstraint.isStricterOrEqualTo(Constraint.UNDEFINED) || secondConstraint.isStricterOrEqualTo(Constraint.UNDEFINED);
  }

  private static boolean atLeastOneNumberOrBoolean(Constraint firstConstraint, Constraint secondConstraint) {
    return firstConstraint.isStricterOrEqualTo(NUMBER_OR_BOOLEAN) || secondConstraint.isStricterOrEqualTo(NUMBER_OR_BOOLEAN);
  }

  private static boolean bothNumberOrBoolean(Constraint firstConstraint, Constraint secondConstraint) {
    return firstConstraint.isStricterOrEqualTo(NUMBER_OR_BOOLEAN) && secondConstraint.isStricterOrEqualTo(NUMBER_OR_BOOLEAN);
  }

  @Override
  public String toString() {
    return firstOperandValue + " + " + secondOperandValue;
  }
}
