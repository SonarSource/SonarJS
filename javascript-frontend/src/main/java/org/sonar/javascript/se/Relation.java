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

import com.google.common.collect.ImmutableSet;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

public class Relation {

  public enum Operator {
    EQUAL_TO(
      "==",
      Kind.EQUAL_TO,
      Kind.NOT_EQUAL_TO,
      Kind.EQUAL_TO,
      ImmutableSet.of(Kind.STRICT_EQUAL_TO, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO)),
    NOT_EQUAL_TO(
      "!=",
      Kind.NOT_EQUAL_TO,
      Kind.EQUAL_TO,
      Kind.NOT_EQUAL_TO,
      ImmutableSet.of(Kind.STRICT_NOT_EQUAL_TO, Kind.LESS_THAN, Kind.GREATER_THAN, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO)),
    STRICT_EQUAL_TO(
      "===",
      Kind.STRICT_EQUAL_TO,
      Kind.STRICT_NOT_EQUAL_TO,
      Kind.STRICT_EQUAL_TO,
      ImmutableSet.of(Kind.EQUAL_TO, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO)),
    STRICT_NOT_EQUAL_TO(
      "!==",
      Kind.STRICT_NOT_EQUAL_TO,
      Kind.STRICT_EQUAL_TO,
      Kind.STRICT_NOT_EQUAL_TO,
      ImmutableSet.of(Kind.NOT_EQUAL_TO, Kind.LESS_THAN, Kind.GREATER_THAN, Kind.LESS_THAN_OR_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO, Kind.EQUAL_TO)),
    LESS_THAN(
      "<",
      Kind.LESS_THAN,
      Kind.GREATER_THAN_OR_EQUAL_TO,
      Kind.GREATER_THAN,
      ImmutableSet.of(Kind.NOT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.LESS_THAN_OR_EQUAL_TO)
    ),
    GREATER_THAN(
      ">",
      Kind.GREATER_THAN,
      Kind.LESS_THAN_OR_EQUAL_TO,
      Kind.LESS_THAN,
      ImmutableSet.of(Kind.NOT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.GREATER_THAN_OR_EQUAL_TO)
    ),
    LESS_THAN_OR_EQUAL_TO(
      "<=",
      Kind.LESS_THAN_OR_EQUAL_TO,
      Kind.GREATER_THAN,
      Kind.GREATER_THAN_OR_EQUAL_TO,
      ImmutableSet.of(Kind.EQUAL_TO, Kind.STRICT_EQUAL_TO, Kind.NOT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.LESS_THAN, Kind.GREATER_THAN_OR_EQUAL_TO)
    ),
    GREATER_THAN_OR_EQUAL_TO(
      ">=",
      Kind.GREATER_THAN_OR_EQUAL_TO,
      Kind.LESS_THAN,
      Kind.LESS_THAN_OR_EQUAL_TO,
      ImmutableSet.of(Kind.EQUAL_TO, Kind.NOT_EQUAL_TO, Kind.STRICT_EQUAL_TO, Kind.STRICT_NOT_EQUAL_TO, Kind.GREATER_THAN, Kind.LESS_THAN_OR_EQUAL_TO)
    );

    private final String operatorString;
    private final Kind kind;
    private final Kind negatedKind;
    private final Kind kindForReversedOperands;
    private final Set<Kind> compatibleKindsForSameOperands;

    private static final Map<Kind, Operator> OPERATOR_BY_KIND = buildOperatorByKind();

    Operator(String operatorString, Kind kind, Kind negatedKind, Kind kindForReversedOperands, Set<Kind> compatibleKindsForSameOperands) {
      this.operatorString = operatorString;
      this.kind = kind;
      this.negatedKind = negatedKind;
      this.kindForReversedOperands = kindForReversedOperands;
      this.compatibleKindsForSameOperands = compatibleKindsForSameOperands;
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
