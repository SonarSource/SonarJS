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

import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

public enum Constraint {

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

  private Constraint(int bitSet) {
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
    if (this.equals(Constraint.TRUTHY)) {
      return Truthiness.TRUTHY;
    } else if (this.and(TRUTHY).equals(NO_POSSIBLE_VALUE)) {
      return Truthiness.FALSY;
    }
    return Truthiness.UNKNOWN;
  }

  public Nullability nullability() {
    if (this.and(NULL_OR_UNDEFINED).equals(this)) {
      return Nullability.NULL;
    } else if (this.and(Constraint.NOT_NULLY).equals(this)) {
      return Nullability.NOT_NULL;
    }
    return Nullability.UNKNOWN;
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

}
