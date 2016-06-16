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

import org.sonar.javascript.se.sv.SymbolicValue;

/**
 * This class represents a constraint which is met by a {@link SymbolicValue} in a given {@link ProgramState}.
 * Possible constraints are NULL, UNDEFINED, TRUTHY, FALSY and any possible combination of them.
 */
public enum Constraint {

  /*
   * Internally, we represent each constraint with 4 bits.
   * Each bit is related to a subset of all possible values.
   * We assign each bit from left to right to the 4 following subsets:
   * - truthy
   * - any falsy value except null and undefined
   * - undefined
   * - null
   *
   * We therefore have 16 possible constraints.
   *
   * Example: NULL is represented by "0001" and NOT_NULL is represented by "1110".
   */

  NO_POSSIBLE_VALUE(0b0000),
  NULL(0b0001),
  UNDEFINED(0b0010),
  NULL_OR_UNDEFINED(0b0011),
  FALSY_NOT_NULLY(0b0100),
  FALSY_NOT_UNDEFINED(0b0101),
  FALSY_NOT_NULL(0b0110),
  FALSY(0b0111),
  TRUTHY(0b1000),
  TRUTHY_OR_NULL(0b1001),
  TRUTHY_OR_UNDEFINED(0b1010),
  TRUTHY_OR_NULLY(0b1011),
  NOT_NULLY(0b1100),
  NOT_UNDEFINED(0b1101),
  NOT_NULL(0b1110),
  ANY_VALUE(0b1111);

  private static final Constraint[] CONSTRAINTS = values();

  private int bitSet;

  Constraint(int bitSet) {
    this.bitSet = bitSet;
  }

  private static Constraint get(int bitSet) {
    return CONSTRAINTS[bitSet];
  }

  public Constraint and(Constraint other) {
    return get(this.bitSet & other.bitSet);
  }

  public Constraint not() {
    return get(~this.bitSet & ANY_VALUE.bitSet);
  }

  public Truthiness truthiness() {
    if (this.equals(TRUTHY)) {
      return Truthiness.TRUTHY;
    } else if (isIncompatibleWith(TRUTHY)) {
      return Truthiness.FALSY;
    }
    return Truthiness.UNKNOWN;
  }

  public Nullability nullability() {
    if (isStricterOrEqualTo(NULL_OR_UNDEFINED)) {
      return Nullability.NULL;
    } else if (isStricterOrEqualTo(NOT_NULLY)) {
      return Nullability.NOT_NULL;
    }
    return Nullability.UNKNOWN;
  }

  public boolean isStricterOrEqualTo(Constraint other) {
    return and(other).equals(this);
  }

  public boolean isIncompatibleWith(Constraint other) {
    return and(other).equals(NO_POSSIBLE_VALUE);
  }

}
