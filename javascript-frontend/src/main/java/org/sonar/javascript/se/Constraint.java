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

import java.util.Objects;
import javax.annotation.Nullable;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

import static org.sonar.javascript.se.Truthiness.FALSY;
import static org.sonar.javascript.se.Truthiness.UNKNOWN;


public class Constraint {

  public static final Constraint UNDEFINED = new Constraint(Nullability.UNDEFINED, FALSY);
  public static final Constraint NOT_UNDEFINED = new Constraint(Nullability.NOT_UNDEFINED, Truthiness.UNKNOWN);

  public static final Constraint NULL = new Constraint(Nullability.NULL, FALSY);
  public static final Constraint NOT_NULL = new Constraint(Nullability.NOT_NULL, Truthiness.UNKNOWN);

  public static final Constraint NULLY = new Constraint(Nullability.NULLY, Truthiness.FALSY);
  public static final Constraint NOT_NULLY = new Constraint(Nullability.NOT_NULLY, Truthiness.UNKNOWN);


  public static final Constraint TRUTHY = new Constraint(Nullability.NOT_NULLY, Truthiness.TRUTHY);
  public static final Constraint FALSY_LITERAL = new Constraint(Nullability.NOT_NULLY, FALSY);

  private Nullability nullability;
  private Truthiness truthiness;

  private Constraint(Nullability nullability, Truthiness truthiness) {
    this.truthiness = truthiness;
    this.nullability = nullability;
  }

  private Constraint(Truthiness truthiness) {
    this.truthiness = truthiness;
    switch (truthiness) {
      case TRUTHY:
        this.nullability = Nullability.NOT_NULLY;
        break;
      case FALSY:
        this.nullability = Nullability.UNKNOWN;
        break;
      default:
        throw new IllegalStateException();
    }
  }

  private Constraint(Nullability nullability) {
    this.nullability = nullability;
    switch (nullability) {
      case NULL:
        this.truthiness = FALSY;
        break;
      case NOT_NULL:
        this.truthiness = UNKNOWN;
        break;
      case UNDEFINED:
        this.truthiness = FALSY;
        break;
      case NOT_UNDEFINED:
        this.truthiness = UNKNOWN;
        break;
      case NULLY:
        this.truthiness = FALSY;
        break;
      case NOT_NULLY:
        this.truthiness = UNKNOWN;
        break;
      default:
        throw new IllegalStateException();
    }
  }

  public Nullability nullability() {
    return nullability;
  }

  public Truthiness truthiness() {
    return truthiness;
  }

  @Nullable
  static Constraint constrain(@Nullable Constraint currentConstraint, Truthiness truthiness) {
    if (truthiness == Truthiness.UNKNOWN) {
      throw new IllegalStateException();
    }

    Constraint newConstraint = null;
    if (currentConstraint == null) {
      newConstraint = new Constraint(truthiness);
    } else if (currentConstraint.truthiness == Truthiness.UNKNOWN) {
      newConstraint = new Constraint(currentConstraint.nullability, truthiness);
    } else if (currentConstraint.truthiness == truthiness) {
      newConstraint = currentConstraint;
    }

    return newConstraint;
  }

  @Nullable
  static Constraint constrain(@Nullable Constraint currentConstraint, Nullability nullability) {
    if (nullability == Nullability.UNKNOWN) {
      throw new IllegalStateException();
    }

    Constraint newConstraint = null;
    if (currentConstraint == null) {
      newConstraint = new Constraint(nullability);
    } else {
      Nullability mergedNullability = Nullability.merge(currentConstraint.nullability, nullability);
      if (mergedNullability != null) {
        newConstraint = new Constraint(mergedNullability, currentConstraint.truthiness);
      }
    }
    return newConstraint;
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
    return isTruthy ? TRUTHY : FALSY_LITERAL;
  }

  @Override
  public String toString() {
    return "{ " +
      "nullability = " + nullability +
      ", truthiness = " + truthiness +
      " }";
  }

  @Override
  public int hashCode() {
    return Objects.hash(nullability, truthiness);
  }

  @Override
  public boolean equals(@Nullable Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null || getClass() != obj.getClass()) {
      return false;
    }
    Constraint other = (Constraint) obj;
    return Objects.equals(this.nullability, other.nullability) && Objects.equals(this.truthiness, other.truthiness);
  }

}
