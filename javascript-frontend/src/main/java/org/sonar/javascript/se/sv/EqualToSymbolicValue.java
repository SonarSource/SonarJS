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
import java.util.Objects;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

/**
 * This class represents symbolic value for equality expression.
 * E.g.
 * <pre>x == null</pre>
 * <pre>foo(x) !== undefined</pre>
 *
 * Current implementation supports only <code>null</code> and <code>undefined</code> as "constraining" operand. There is no limitation on "constrained" operand.
 */
public class EqualToSymbolicValue implements SymbolicValue {

  private static final Map<SpecialSymbolicValue, Constraint> EQUAL_CONSTRAINTS = ImmutableMap.of(
    SpecialSymbolicValue.NULL, Constraint.NULL_OR_UNDEFINED,
    SpecialSymbolicValue.UNDEFINED, Constraint.NULL_OR_UNDEFINED);

  private static final Map<SpecialSymbolicValue, Constraint> NOT_EQUAL_CONSTRAINTS = ImmutableMap.of(
    SpecialSymbolicValue.NULL, Constraint.NOT_NULLY,
    SpecialSymbolicValue.UNDEFINED, Constraint.NOT_NULLY);

  private static final Map<SpecialSymbolicValue, Constraint> STRICT_EQUAL_CONSTRAINTS = ImmutableMap.of(
    SpecialSymbolicValue.NULL, Constraint.NULL,
    SpecialSymbolicValue.UNDEFINED, Constraint.UNDEFINED);

  private static final Map<SpecialSymbolicValue, Constraint> STRICT_NOT_EQUAL_CONSTRAINTS = ImmutableMap.of(
    SpecialSymbolicValue.NULL, Constraint.NULL.not(),
    SpecialSymbolicValue.UNDEFINED, Constraint.UNDEFINED.not());

  private final SymbolicValue firstOperandValue;
  private final Constraint secondOperandConstraint;

  public EqualToSymbolicValue(SymbolicValue firstOperandValue, Constraint constraint) {
    Preconditions.checkArgument(firstOperandValue != null, "operandValue should not be null");
    this.firstOperandValue = firstOperandValue;
    this.secondOperandConstraint = constraint;
  }

  public static SymbolicValue createEqual(SymbolicValue operand1, SymbolicValue operand2) {
    return create(EQUAL_CONSTRAINTS, operand1, operand2, false);
  }

  public static SymbolicValue createNotEqual(SymbolicValue operand1, SymbolicValue operand2) {
    return create(NOT_EQUAL_CONSTRAINTS, operand1, operand2, true);
  }

  public static SymbolicValue createStrictEqual(SymbolicValue operand1, SymbolicValue operand2) {
    return create(STRICT_EQUAL_CONSTRAINTS, operand1, operand2, false);
  }

  public static SymbolicValue createStrictNotEqual(SymbolicValue operand1, SymbolicValue operand2) {
    return create(STRICT_NOT_EQUAL_CONSTRAINTS, operand1, operand2, true);
  }

  private static SymbolicValue create(Map<SpecialSymbolicValue, Constraint> map, SymbolicValue operand1, SymbolicValue operand2, boolean isLogicalNot) {
    Constraint constraint = map.get(operand1);
    if (constraint != null && operand2 != null) {
      return new EqualToSymbolicValue(operand2, constraint);
    }
    constraint = map.get(operand2);
    if (constraint != null && operand1 != null) {
      return new EqualToSymbolicValue(operand1, constraint);
    }
    SymbolicValue typeOfComparison = TypeOfComparisonSymbolicValue.create(operand1, operand2);
    if (typeOfComparison != null) {
      if (isLogicalNot) {
        typeOfComparison = LogicalNotSymbolicValue.create(typeOfComparison);
      }
      return typeOfComparison;
    }
    return UnknownSymbolicValue.UNKNOWN;
  }

  @Override
  public List<ProgramState> constrain(ProgramState state, Constraint constraint) {
    if (constraint.equals(Constraint.TRUTHY)) {
      return firstOperandValue.constrain(state, secondOperandConstraint);

    } else if (constraint.equals(Constraint.FALSY)) {
      return firstOperandValue.constrain(state, secondOperandConstraint.not());

    }

    return ImmutableList.of();
  }

  @Override
  public Constraint inherentConstraint() {
    return secondOperandConstraint;
  }

  @Override
  public String toString() {
    return firstOperandValue + " === " + secondOperandConstraint;
  }

  @Override
  public int hashCode() {
    return Objects.hash(firstOperandValue, secondOperandConstraint);
  }

  @Override
  public boolean equals(Object obj) {
    if (obj instanceof EqualToSymbolicValue) {
      EqualToSymbolicValue other = (EqualToSymbolicValue) obj;
      return Objects.equals(this.firstOperandValue, other.firstOperandValue)
        && Objects.equals(this.secondOperandConstraint, other.secondOperandConstraint);
    }
    return false;
  }

}
