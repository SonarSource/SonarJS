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
package org.sonar.javascript.se;

import com.google.common.collect.BoundType;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Range;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.BiFunction;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class Relation {

  public enum Operator {
    EQUAL_TO(
      "==",
      Kind.EQUAL_TO,
      Kind.NOT_EQUAL_TO,
      Kind.EQUAL_TO,
      ImmutableSet.of(Kind.STRICT_EQUAL_TO, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO),
      Operator::areEqual),
    NOT_EQUAL_TO(
      "!=",
      Kind.NOT_EQUAL_TO,
      Kind.EQUAL_TO,
      Kind.NOT_EQUAL_TO,
      ImmutableSet.of(Kind.STRICT_NOT_EQUAL_TO, Kind.LESS_THAN, Kind.GREATER_THAN, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO),
      Operator::areNotEqual),
    STRICT_EQUAL_TO(
      "===",
      Kind.STRICT_EQUAL_TO,
      Kind.STRICT_NOT_EQUAL_TO,
      Kind.STRICT_EQUAL_TO,
      ImmutableSet.of(Kind.EQUAL_TO, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO),
      Operator::areEqual),
    STRICT_NOT_EQUAL_TO(
      "!==",
      Kind.STRICT_NOT_EQUAL_TO,
      Kind.STRICT_EQUAL_TO,
      Kind.STRICT_NOT_EQUAL_TO,
      ImmutableSet.of(Kind.NOT_EQUAL_TO, Kind.LESS_THAN, Kind.GREATER_THAN, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO, Kind.EQUAL_TO),
      Operator::areNotEqual),
    LESS_THAN(
      "<",
      Kind.LESS_THAN,
      Kind.GREATER_THAN_OR_EQUAL_TO,
      Kind.GREATER_THAN,
      ImmutableSet.of(Kind.NOT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.LESS_THAN_OR_EQUAL_TO),
      Operator::lessThan),
    GREATER_THAN(
      ">",
      Kind.GREATER_THAN,
      Kind.LESS_THAN_OR_EQUAL_TO,
      Kind.LESS_THAN,
      ImmutableSet.of(Kind.NOT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO),
      Operator::greaterThan),
    LESS_THAN_OR_EQUAL_TO(
      "<=",
      Kind.LESS_THAN_OR_EQUAL_TO,
      Kind.GREATER_THAN,
      Kind.GREATER_THAN_OR_EQUAL_TO,
      ImmutableSet.of(Kind.EQUAL_TO, Kind.STRICT_EQUAL_TO, Kind.NOT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.LESS_THAN, Kind.GREATER_THAN_OR_EQUAL_TO),
      Operator::lessThan),
    GREATER_THAN_OR_EQUAL_TO(
      ">=",
      Kind.GREATER_THAN_OR_EQUAL_TO,
      Kind.LESS_THAN,
      Kind.LESS_THAN_OR_EQUAL_TO,
      ImmutableSet.of(Kind.EQUAL_TO, Kind.NOT_EQUAL_TO, Kind.STRICT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.GREATER_THAN, Kind.LESS_THAN_OR_EQUAL_TO),
      Operator::greaterThan);

    private final String operatorString;
    private final Kind kind;
    private final Kind negatedKind;
    private final Kind kindForReversedOperands;
    private final Set<Kind> compatibleKindsForSameOperands;
    final BiFunction<Range<Integer>, Range<Integer>, Optional<Boolean>> numericComparison;

    private static final Map<Kind, Operator> OPERATOR_BY_KIND = buildOperatorByKind();

    Operator(String operatorString, Kind kind, Kind negatedKind, Kind kindForReversedOperands, Set<Kind> compatibleKindsForSameOperands,
      BiFunction<Range<Integer>, Range<Integer>, Optional<Boolean>> numericComparison) {
      this.operatorString = operatorString;
      this.kind = kind;
      this.negatedKind = negatedKind;
      this.kindForReversedOperands = kindForReversedOperands;
      this.compatibleKindsForSameOperands = compatibleKindsForSameOperands;
      this.numericComparison = numericComparison;
    }

    private static Map<Kind, Operator> buildOperatorByKind() {
      Map<Kind, Operator> map = new EnumMap<>(Kind.class);
      for (Operator value : values()) {
        map.put(value.kind, value);
      }
      return map;
    }

    private static Operator fromKind(Kind kind) {
      return OPERATOR_BY_KIND.get(kind);
    }

    public boolean isCompatibleForSameOperands(Operator other) {
      return this == other || this.compatibleKindsForSameOperands.contains(other.kind);
    }

    public Operator onReversedOperands() {
      return fromKind(kindForReversedOperands);
    }

    public Operator not() {
      return fromKind(negatedKind);
    }

    public String operatorString() {
      return operatorString;
    }

    private static Optional<Boolean> areEqual(Range<Integer> range1, Range<Integer> range2) {
      return !range1.isConnected(range2) || range1.intersection(range2).isEmpty() ? Optional.of(false) : Optional.empty();
    }

    private static Optional<Boolean> areNotEqual(Range range1, Range range2) {
      return not(areEqual(range1, range2));
    }

    private static Optional<Boolean> lessThan(Range<Integer> range1, Range<Integer> range2) {
      if (range1.hasUpperBound() && range2.hasLowerBound() && range1.upperEndpoint() <= range2.lowerEndpoint()
        && atLeastOneBoundIsOpen(range2.lowerBoundType(), range1.upperBoundType())) {

        return Optional.of(true);

      } else if (range2.hasUpperBound() && range1.hasLowerBound() && range1.lowerEndpoint() >= range2.upperEndpoint()
        && atLeastOneBoundIsOpen(range1.lowerBoundType(), range2.upperBoundType())) {

        return Optional.of(false);

      } else {
        return Optional.empty();
      }
    }

    private static Optional<Boolean> greaterThan(Range<Integer> range1, Range<Integer> range2) {
      return lessThan(range2, range1);
    }

    private static Optional<Boolean> not(Optional<Boolean> value) {
      if (value.isPresent()) {
        return Optional.of(!value.get());
      }

      return value;
    }

    private static boolean atLeastOneBoundIsOpen(BoundType type1, BoundType type2) {
      return type1.equals(BoundType.OPEN) || type2.equals(BoundType.OPEN);
    }

  }

  private final Operator operator;
  private final SymbolicValue leftOperand;
  private final SymbolicValue rightOperand;
  private final Set<SymbolicValue> operands;

  public Relation(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    this(Operator.fromKind(kind), leftOperand, rightOperand);
  }

  private Relation(Operator operator, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    this.operator = operator;
    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
    this.operands = ImmutableSet.of(leftOperand, rightOperand);
  }

  public Relation not() {
    return new Relation(operator.not(), leftOperand, rightOperand);
  }

  public boolean isCompatibleWith(Relation other) {
    boolean result = true;

    if (other.leftOperand.equals(this.leftOperand) && other.rightOperand.equals(this.rightOperand)) {
      result = other.operator.isCompatibleForSameOperands(this.operator);

    } else if (other.leftOperand.equals(this.rightOperand) && other.rightOperand.equals(leftOperand)) {
      result = other.operator.isCompatibleForSameOperands(this.operator.onReversedOperands());
    }

    return result;
  }

  public Set<SymbolicValue> operands() {
    return operands;
  }

  public SymbolicValue leftOperand() {
    return leftOperand;
  }

  public SymbolicValue rightOperand() {
    return rightOperand;
  }

  public Operator operator() {
    return operator;
  }

  public Optional<Boolean> applyNumericComparison(ProgramState state) {
    Optional<Range<Integer>> leftRange = state.getConstraint(leftOperand()).numericRange();
    Optional<Range<Integer>> rightRange = state.getConstraint(rightOperand()).numericRange();

    if (leftRange.isPresent() && rightRange.isPresent()) {
      return operator.numericComparison.apply(leftRange.get(), rightRange.get());
    }

    return Optional.empty();
  }

  @Override
  public boolean equals(Object obj) {
    if (obj instanceof Relation) {
      Relation other = (Relation) obj;
      return Objects.equals(this.operator, other.operator)
        && Objects.equals(this.leftOperand, other.leftOperand)
        && Objects.equals(this.rightOperand, other.rightOperand);
    }
    return false;
  }

  @Override
  public int hashCode() {
    return Objects.hash(operator, leftOperand, rightOperand);
  }

  @Override
  public String toString() {
    return leftOperand + " " + operator.operatorString() + " " + rightOperand;
  }

}
