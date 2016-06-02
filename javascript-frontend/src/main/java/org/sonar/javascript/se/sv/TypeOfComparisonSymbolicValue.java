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
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

/**
 * <code>typeof x == "object"</code>
 */
public class TypeOfComparisonSymbolicValue implements SymbolicValue {

  private final SymbolicValue operandValue;
  private final String comparedTypeString;

  private static final Map<String, Constraint> TYPEOF_EQUAL_CONSTRAINTS = ImmutableMap.<String, Constraint>builder()
    .put("undefined", Constraint.UNDEFINED)
    .put("function", Constraint.TRUTHY)
    .put("object", Constraint.TRUTHY_OR_NULL)
    .put("number", Constraint.NOT_NULLY)
    .put("string", Constraint.NOT_NULLY)
    .put("boolean", Constraint.NOT_NULLY)
    .put("symbol", Constraint.NOT_NULLY)
    .build();

  private static final Map<String, Constraint> TYPEOF_NOT_EQUAL_CONSTRAINTS = ImmutableMap.<String, Constraint>builder()
    .put("undefined", Constraint.UNDEFINED.not())
    .put("object", Constraint.NULL.not())
    .build();

  public TypeOfComparisonSymbolicValue(SymbolicValue operandValue, String comparedTypeString) {
    Preconditions.checkArgument(operandValue != null, "operandValue should not be null");
    Preconditions.checkArgument(comparedTypeString != null, "comparedTypeString should not be null");
    this.operandValue = operandValue;
    this.comparedTypeString = comparedTypeString;
  }

  @Override
  public List<ProgramState> constrain(ProgramState state, Constraint constraint) {
    Constraint truthyConstraint = TYPEOF_EQUAL_CONSTRAINTS.get(comparedTypeString);
    Constraint falsyConstraint = TYPEOF_NOT_EQUAL_CONSTRAINTS.get(comparedTypeString);

    if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
      return truthyConstraint != null ? operandValue.constrain(state, truthyConstraint) : ImmutableList.of();

    } else if (constraint.isStricterOrEqualTo(Constraint.FALSY) && falsyConstraint != null) {
      return operandValue.constrain(state, falsyConstraint);

    }

    return ImmutableList.of(state);
  }

  @Override
  public String toString() {
    return "typeof " + operandValue + " == '" + comparedTypeString + "'";
  }
}
