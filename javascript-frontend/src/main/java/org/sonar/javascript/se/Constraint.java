/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.ImmutableSet.Builder;
import com.google.common.collect.Range;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.sonar.javascript.se.sv.SymbolicValue;

/**
 * This class represents a constraint which is met by a {@link SymbolicValue} in a given {@link ProgramState}.
 * Possible constraints are NULL, UNDEFINED, ZERO, EMPTY_STRING, NAN, FALSE, TRUE, FUNCTION, TRUTHY_NUMBER, TRUTHY_STRING, ARRAY, OTHER_OBJECT and any possible combination of them.
 */
public class Constraint {

  /*
   * Internally, we represent each constraint with 12 bits.
   * Each bit is related to a subset of all possible values.
   * We assign each bit from left to right to the 12 following subsets:
   *
   * FALSY
   * 1. null
   * 2. undefined
   * 3. 0 (zero numeric value)
   * 4. empty string ("")
   * 5. NaN
   * 6. false (boolean value)
   *
   * TRUTHY
   * 7. true (boolean value)
   * 8. function
   * 9. truthy number (any number except 0)
   * 10. truthy string (any string except empty string)
   * 11. array
   * 12. other object
   *
   * We therefore have 2^12 possible constraints.
   *
   * Example: NULL is represented by "100 000 000 000" and NOT_NULL is represented by "011 111 111 111".
   */
  private int bitSet;

  public static final Constraint ANY_VALUE = anyValue();
  public static final Constraint NO_POSSIBLE_VALUE = ANY_VALUE.not();

  public static final Constraint NULL = new Constraint(ValueSubSet.NULL);
  public static final Constraint UNDEFINED = new Constraint(ValueSubSet.UNDEFINED);
  public static final Constraint ZERO = new Constraint(ValueSubSet.ZERO);
  public static final Constraint EMPTY_STRING_PRIMITIVE = new Constraint(ValueSubSet.EMPTY_STRING);
  public static final Constraint NAN = new Constraint(ValueSubSet.NAN);
  public static final Constraint FALSE = new Constraint(ValueSubSet.FALSE);
  public static final Constraint TRUE = new Constraint(ValueSubSet.TRUE);
  public static final Constraint FUNCTION = new Constraint(ValueSubSet.FUNCTION);
  public static final Constraint POSITIVE_NUMBER_PRIMITIVE = new Constraint(ValueSubSet.POSITIVE_NUMBER);
  public static final Constraint NEGATIVE_NUMBER_PRIMITIVE = new Constraint(ValueSubSet.NEGATIVE_NUMBER);
  public static final Constraint TRUTHY_STRING_PRIMITIVE = new Constraint(ValueSubSet.TRUTHY_STRING);
  public static final Constraint ARRAY = new Constraint(ValueSubSet.ARRAY);
  public static final Constraint DATE = new Constraint(ValueSubSet.DATE);
  public static final Constraint REGEXP = new Constraint(ValueSubSet.REGEXP);
  public static final Constraint STRING_OBJECT = new Constraint(ValueSubSet.STRING_OBJECT);
  public static final Constraint NUMBER_OBJECT = new Constraint(ValueSubSet.NUMBER_OBJECT);
  public static final Constraint BOOLEAN_OBJECT = new Constraint(ValueSubSet.BOOLEAN_OBJECT);
  public static final Constraint OTHER_OBJECT = new Constraint(ValueSubSet.OTHER_OBJECT);
  public static final Constraint NULL_OR_UNDEFINED = NULL.or(UNDEFINED);

  public static final Constraint TRUTHY_NUMBER_PRIMITIVE = or(POSITIVE_NUMBER_PRIMITIVE, NEGATIVE_NUMBER_PRIMITIVE);
  public static final Constraint KNOWN_OBJECTS = or(FUNCTION, ARRAY, DATE, REGEXP, STRING_OBJECT, NUMBER_OBJECT, BOOLEAN_OBJECT);
  public static final Constraint NOT_NULLY = NULL_OR_UNDEFINED.not();
  public static final Constraint TRUTHY = or(TRUE, TRUTHY_NUMBER_PRIMITIVE, TRUTHY_STRING_PRIMITIVE, KNOWN_OBJECTS, OTHER_OBJECT);
  public static final Constraint FALSY = TRUTHY.not();
  public static final Constraint NUMBER_PRIMITIVE = or(ZERO, NAN, TRUTHY_NUMBER_PRIMITIVE);
  public static final Constraint ANY_NUMBER = or(NUMBER_PRIMITIVE, NUMBER_OBJECT);
  public static final Constraint STRING_PRIMITIVE = or(EMPTY_STRING_PRIMITIVE, TRUTHY_STRING_PRIMITIVE);
  public static final Constraint ANY_STRING = or(STRING_PRIMITIVE, STRING_OBJECT);
  public static final Constraint BOOLEAN_PRIMITIVE = or(TRUE, FALSE);
  public static final Constraint ANY_BOOLEAN = or(BOOLEAN_PRIMITIVE, BOOLEAN_OBJECT);
  public static final Constraint OBJECT = or(KNOWN_OBJECTS, OTHER_OBJECT);

  private static final Map<Constraint, String> COMMON_CONSTRAINT_NAMES = ImmutableMap.<Constraint, String>builder()
    .put(ANY_VALUE, "ANY_VALUE")
    .put(NO_POSSIBLE_VALUE, "NO_POSSIBLE_VALUE")
    .put(TRUTHY, "TRUTHY")
    .put(FALSY, "FALSY")
    .put(NOT_NULLY, "NOT_NULLY")
    .build();

  private static final Map<Constraint, Range<Integer>> NUMERIC_RANGES = ImmutableMap.<Constraint, Range<Integer>>builder()
    .put(Constraint.POSITIVE_NUMBER_PRIMITIVE, Range.greaterThan(0))
    .put(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO), Range.atLeast(0))
    .put(Constraint.NEGATIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO), Range.atMost(0))
    .put(Constraint.NEGATIVE_NUMBER_PRIMITIVE, Range.lessThan(0))
    .put(Constraint.ZERO, Range.singleton(0))
    .build();
  private static final Set<Constraint> SINGLE_VALUE_CONSTRAINTS = new HashSet<>();
  static {
    SINGLE_VALUE_CONSTRAINTS.add(ZERO);
    SINGLE_VALUE_CONSTRAINTS.add(TRUE);
    SINGLE_VALUE_CONSTRAINTS.add(FALSE);
    SINGLE_VALUE_CONSTRAINTS.add(EMPTY_STRING_PRIMITIVE);
    SINGLE_VALUE_CONSTRAINTS.add(NULL);
    SINGLE_VALUE_CONSTRAINTS.add(UNDEFINED);
  }

  private enum ValueSubSet {
    NULL,
    UNDEFINED,
    ZERO,
    EMPTY_STRING,
    NAN,
    FALSE,
    TRUE,
    FUNCTION,
    NEGATIVE_NUMBER,
    POSITIVE_NUMBER,
    TRUTHY_STRING,
    ARRAY,
    DATE,
    REGEXP,
    STRING_OBJECT,
    NUMBER_OBJECT,
    BOOLEAN_OBJECT,
    OTHER_OBJECT;

    private int bitSet() {
      return 1 << ordinal();
    }

  }

  private Constraint(ValueSubSet subSet) {
    this(subSet.bitSet());
  }

  private Constraint(int bitSet) {
    this.bitSet = bitSet;
  }

  private static Constraint get(int bitSet) {
    return new Constraint(bitSet);
  }

  private static Constraint anyValue() {
    int bitSet = 0;
    for (ValueSubSet subSet : ValueSubSet.values()) {
      bitSet |= subSet.bitSet();
    }
    return new Constraint(bitSet);
  }

  private static Constraint or(Constraint... constraints) {
    Preconditions.checkArgument(constraints.length > 0);
    Constraint constraint = constraints[0];
    for (int i = 1; i < constraints.length; i++) {
      constraint = constraint.or(constraints[i]);
    }
    return constraint;
  }

  public Constraint and(Constraint other) {
    return get(this.bitSet & other.bitSet);
  }

  public Constraint or(Constraint other) {
    return get(this.bitSet | other.bitSet);
  }

  public Constraint not() {
    return get(~this.bitSet & ANY_VALUE.bitSet);
  }

  public Type type() {
    return Type.find(this);
  }

  /**
   * Returns numeric range corresponding to the constraint (if constraint is pure numeric).
   */
  public Optional<Range<Integer>> numericRange() {
    if (NUMERIC_RANGES.containsKey(this)) {
      return Optional.of(NUMERIC_RANGES.get(this));
    }

    return Optional.empty();
  }

  public boolean isSingleValue() {
    return SINGLE_VALUE_CONSTRAINTS.contains(this);
  }

  public Set<Type> typeSet() {
    Builder<Type> builder = ImmutableSet.builder();
    for (Type type : Type.values()) {
      if (!this.isIncompatibleWith(type.constraint())) {
        builder.add(type);
      }
    }

    return builder.build();
  }

  public boolean isStricterOrEqualTo(Constraint other) {
    return and(other).equals(this);
  }

  public boolean isIncompatibleWith(Constraint other) {
    return and(other).equals(NO_POSSIBLE_VALUE);
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }

    Constraint that = (Constraint) o;
    return bitSet == that.bitSet;
  }

  @Override
  public int hashCode() {
    return bitSet;
  }

  @Override
  public String toString() {
    String name = COMMON_CONSTRAINT_NAMES.get(this);
    if (name != null) {
      return name;
    }

    StringBuilder result = new StringBuilder();
    for (ValueSubSet subSet : ValueSubSet.values()) {
      if ((this.bitSet & subSet.bitSet()) == subSet.bitSet()) {
        result.append("|").append(subSet);
      }
    }
    return result.substring(1);
  }
}
