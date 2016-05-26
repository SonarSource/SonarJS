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

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableMap.Builder;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;


public enum Constraint {

  UNKNOWN(Nullability.UNKNOWN, Truthiness.UNKNOWN),

  NOT_UNDEFINED(Nullability.NOT_UNDEFINED, Truthiness.UNKNOWN),

  NOT_NULL(Nullability.NOT_NULL, Truthiness.UNKNOWN),

  NOT_NULLY(Nullability.NOT_NULLY, Truthiness.UNKNOWN),

  FALSY(Nullability.UNKNOWN, Truthiness.FALSY),

  FALSY_NOT_UNDEFINED(Nullability.NOT_UNDEFINED, Truthiness.FALSY),

  FALSY_NOT_NULL(Nullability.NOT_NULL, Truthiness.FALSY),

  FALSY_NOT_NULLY(Nullability.NOT_NULLY, Truthiness.FALSY),

  UNDEFINED(Nullability.UNDEFINED, Truthiness.FALSY),

  NULL(Nullability.NULL, Truthiness.FALSY),

  NULLY(Nullability.NULLY, Truthiness.FALSY),

  TRUTHY(Nullability.NOT_NULLY, Truthiness.TRUTHY);

  private Nullability nullability;
  private Truthiness truthiness;

  private static Map<Constraint, Map<Truthiness, Constraint>> truthinessMap;
  private static Map<Constraint, Map<Nullability, Constraint>> nullabilityMap;

  static {
    Builder<Constraint, Map<Truthiness, Constraint>> builder = ImmutableMap.builder();
    builder.put(UNKNOWN, ImmutableMap.of(
      Truthiness.TRUTHY, TRUTHY, Truthiness.FALSY, FALSY));

    builder.put(NOT_UNDEFINED, ImmutableMap.of(
      Truthiness.TRUTHY, TRUTHY, Truthiness.FALSY, FALSY_NOT_UNDEFINED));

    builder.put(NOT_NULL, ImmutableMap.of(
      Truthiness.TRUTHY, TRUTHY, Truthiness.FALSY, FALSY_NOT_NULL));

    builder.put(NOT_NULLY, ImmutableMap.of(
      Truthiness.TRUTHY, TRUTHY, Truthiness.FALSY, FALSY_NOT_NULLY));

    builder.put(FALSY, ImmutableMap.of(
      Truthiness.FALSY, FALSY));

    builder.put(FALSY_NOT_UNDEFINED, ImmutableMap.of(
      Truthiness.FALSY, FALSY_NOT_UNDEFINED));

    builder.put(FALSY_NOT_NULL, ImmutableMap.of(
      Truthiness.FALSY, FALSY_NOT_NULL));

    builder.put(FALSY_NOT_NULLY, ImmutableMap.of(
      Truthiness.FALSY, FALSY_NOT_NULLY));

    builder.put(UNDEFINED, ImmutableMap.of(
      Truthiness.FALSY, UNDEFINED));

    builder.put(NULL, ImmutableMap.of(
      Truthiness.FALSY, NULL));

    builder.put(NULLY, ImmutableMap.of(
      Truthiness.FALSY, NULLY));

    builder.put(TRUTHY, ImmutableMap.of(
      Truthiness.TRUTHY, TRUTHY));

    truthinessMap = builder.build();
  }

  static {
    Builder<Constraint, Map<Nullability, Constraint>> builder = ImmutableMap.builder();

    Map<Nullability, Constraint> unknown = new HashMap<>();
    for (Nullability nullability : Nullability.values()) {
      unknown.put(nullability, Constraint.valueOf(nullability.toString()));
    }
    builder.put(UNKNOWN, unknown);

    builder.put(NOT_UNDEFINED, ImmutableMap.of(
      Nullability.NULL, NULL,
      Nullability.NOT_NULL, NOT_NULLY,
      Nullability.NOT_UNDEFINED, NOT_UNDEFINED,
      Nullability.NULLY, NULL,
      Nullability.NOT_NULLY, NOT_NULLY));

    builder.put(NOT_NULL, ImmutableMap.of(
      Nullability.NOT_NULL, NOT_NULL,
      Nullability.UNDEFINED, UNDEFINED,
      Nullability.NOT_UNDEFINED, NOT_NULLY,
      Nullability.NULLY, UNDEFINED,
      Nullability.NOT_NULLY, NOT_NULLY));

    builder.put(NOT_NULLY, ImmutableMap.of(
      Nullability.NOT_NULL, NOT_NULLY,
      Nullability.NOT_UNDEFINED, NOT_NULLY,
      Nullability.NOT_NULLY, NOT_NULLY));

    builder.put(FALSY, ImmutableMap.<Nullability, Constraint>builder()
      .put(Nullability.NULL, NULL)
      .put(Nullability.NOT_NULL, FALSY_NOT_NULL)
      .put(Nullability.UNDEFINED, UNDEFINED)
      .put(Nullability.NOT_UNDEFINED, FALSY_NOT_UNDEFINED)
      .put(Nullability.NULLY, NULLY)
      .put(Nullability.NOT_NULLY, FALSY_NOT_NULLY).build());

    builder.put(FALSY_NOT_UNDEFINED, ImmutableMap.of(
      Nullability.NULL, NULL,
      Nullability.NOT_NULL, FALSY_NOT_NULLY,
      Nullability.NOT_UNDEFINED, FALSY_NOT_UNDEFINED,
      Nullability.NULLY, NULL,
      Nullability.NOT_NULLY, FALSY_NOT_NULLY));

    builder.put(FALSY_NOT_NULL, ImmutableMap.of(
      Nullability.NOT_NULL, FALSY_NOT_NULL,
      Nullability.UNDEFINED, UNDEFINED,
      Nullability.NOT_UNDEFINED, FALSY_NOT_NULLY,
      Nullability.NULLY, UNDEFINED,
      Nullability.NOT_NULLY, FALSY_NOT_NULLY));

    builder.put(FALSY_NOT_NULLY, ImmutableMap.of(
      Nullability.NOT_NULL, FALSY_NOT_NULLY,
      Nullability.NOT_UNDEFINED, FALSY_NOT_NULLY,
      Nullability.NOT_NULLY, FALSY_NOT_NULLY));

    builder.put(UNDEFINED, ImmutableMap.of(
      Nullability.NOT_NULL, UNDEFINED,
      Nullability.UNDEFINED, UNDEFINED,
      Nullability.NULLY, UNDEFINED));

    builder.put(NULL, ImmutableMap.of(
      Nullability.NULL, NULL,
      Nullability.NOT_UNDEFINED, NULL,
      Nullability.NULLY, NULL));

    builder.put(NULLY, ImmutableMap.of(
      Nullability.NULL, NULL,
      Nullability.NOT_NULL, UNDEFINED,
      Nullability.UNDEFINED, UNDEFINED,
      Nullability.NOT_UNDEFINED, NULL,
      Nullability.NULLY, NULLY));

    builder.put(TRUTHY, ImmutableMap.of(
      Nullability.NOT_NULL, TRUTHY,
      Nullability.NOT_UNDEFINED, TRUTHY,
      Nullability.NOT_NULLY, TRUTHY));

    nullabilityMap = builder.build();
  }

  Constraint(Nullability nullability, Truthiness truthiness) {
    this.truthiness = truthiness;
    this.nullability = nullability;
  }

  private static <T> Constraint get(T subConstraint) {
    return Constraint.valueOf(subConstraint.toString());
  }

  public Nullability nullability() {
    return nullability;
  }

  public Truthiness truthiness() {
    return truthiness;
  }

  @Nullable
  // returns null if this constraining is conflicting
  static Constraint constrain(@Nullable Constraint currentConstraint, Truthiness truthiness) {
    if (truthiness == Truthiness.UNKNOWN) {
      throw new IllegalStateException();
    }

    if (currentConstraint == null) {
      return Constraint.get(truthiness);

    } else {
      return truthinessMap.get(currentConstraint).get(truthiness);
    }
  }


  @Nullable
  // returns null if this constraining is conflicting
  static Constraint constrain(@Nullable Constraint currentConstraint, Nullability nullability) {
    if (nullability == Nullability.UNKNOWN) {
      throw new IllegalStateException();
    }

    if (currentConstraint == null) {
      return Constraint.get(nullability);

    } else {
      return nullabilityMap.get(currentConstraint).get(nullability);
    }
  }

  @Nullable
  public static Constraint get(ExpressionTree expression) {
    Constraint constraint = null;

    if (expression.is(Kind.NULL_LITERAL)) {
      constraint = NULL;

    } else if (expression.is(Kind.BOOLEAN_LITERAL)) {
      constraint = booleanLiteral((LiteralTree) expression);

    } else if (expression.is(Kind.STRING_LITERAL)) {
      constraint = stringLiteral((LiteralTree) expression);

    } else if (expression.is(Kind.NUMERIC_LITERAL)) {
      constraint = numericLiteral((LiteralTree) expression);

    } else if (expression.is(Kind.IDENTIFIER_REFERENCE)) {
      IdentifierTree identifier = (IdentifierTree) expression;
      // TODO undefined may be used as an an identifier in a non-global scope
      if ("undefined".equals(identifier.name())) {
        constraint = UNDEFINED;
      }

    }
    return constraint;
  }

  private static Constraint booleanLiteral(LiteralTree expression) {
    return literal("true".equals(expression.value()));
  }

  private static Constraint stringLiteral(LiteralTree expression) {
    return literal(expression.value().length() > 2);
  }

  private static Constraint numericLiteral(LiteralTree expression) {
    String stringValue = expression.value();

    if (stringValue.startsWith("0x")
      || stringValue.startsWith("0b")
      || stringValue.startsWith("0o")
      || stringValue.startsWith("0O")) {

      return literal(hasNonZero(stringValue.substring(2)));
    }

    int exponentIndex = stringValue.indexOf('e');
    if (exponentIndex == -1) {
      exponentIndex = stringValue.indexOf('E');
    }
    if (exponentIndex > -1) {
      stringValue = stringValue.substring(0, exponentIndex);
    }
    return literal(hasNonZero(stringValue));
  }

  private static boolean hasNonZero(String str) {
    for (int i = 0; i < str.length(); i++) {
      char c = str.charAt(i);
      if (c != '0' && c != '.') {
        return true;
      }
    }
    return false;
  }

  public static Constraint literal(boolean isTruthy) {
    return isTruthy ? TRUTHY : FALSY_NOT_NULLY;
  }

  @Override
  public String toString() {
    return "{ " +
      "nullability = " + nullability +
      ", truthiness = " + truthiness +
      " }";
  }

}
