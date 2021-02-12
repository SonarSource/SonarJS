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

import com.google.common.collect.ImmutableMap;
import java.util.Map;
import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

import static org.sonar.javascript.se.Constraint.NAN;
import static org.sonar.javascript.se.Constraint.NEGATIVE_NUMBER_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.NUMBER_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.POSITIVE_NUMBER_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.ZERO;

/**
 * Symbolic value used for numeric negation ("-x")
 */
public class UnaryMinusSymbolicValue implements SymbolicValue {

  private final SymbolicValue operandValue;

  private static final Map<Constraint, Constraint> CONSTRAINT_TRANSITIONS = ImmutableMap.<Constraint, Constraint>builder()
    .put(POSITIVE_NUMBER_PRIMITIVE, NEGATIVE_NUMBER_PRIMITIVE)
    .put(NEGATIVE_NUMBER_PRIMITIVE, POSITIVE_NUMBER_PRIMITIVE)
    .put(NEGATIVE_NUMBER_PRIMITIVE.or(ZERO), POSITIVE_NUMBER_PRIMITIVE.or(ZERO))
    .put(POSITIVE_NUMBER_PRIMITIVE.or(ZERO), NEGATIVE_NUMBER_PRIMITIVE.or(ZERO))
    .put(ZERO, ZERO)
    .put(NAN, NAN).build();

  public UnaryMinusSymbolicValue(SymbolicValue operandValue) {
    this.operandValue = operandValue;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    Constraint constraint = CONSTRAINT_TRANSITIONS.get(state.getConstraint(operandValue));
    if (constraint == null) {
      return NUMBER_PRIMITIVE;
    }
    return constraint;
  }
}
