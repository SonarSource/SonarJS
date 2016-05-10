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
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.ExpressionTree;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;
import org.sonar.plugins.javascript.api.tree.expression.LiteralTree;

public class SymbolicValue {

  public static final SymbolicValue NULL_OR_UNDEFINED = new SymbolicValue(Nullability.NULL, Truthiness.FALSY);
  public static final SymbolicValue UNKNOWN = new SymbolicValue(Nullability.UNKNOWN, Truthiness.UNKNOWN);

  private static final SymbolicValue TRUTHY_LITERAL = new SymbolicValue(Nullability.NOT_NULL, Truthiness.TRUTHY);
  private static final SymbolicValue FALSY_LITERAL = new SymbolicValue(Nullability.NOT_NULL, Truthiness.FALSY);

  private final Nullability nullability;
  private final Truthiness truthiness;

  private SymbolicValue(Nullability nullability, Truthiness truthiness) {
    this.nullability = nullability;
    this.truthiness = truthiness;
  }

  public static SymbolicValue get(ExpressionTree expression) {
    SymbolicValue value = UNKNOWN;

    if (expression.is(Kind.NULL_LITERAL)) {
      value = NULL_OR_UNDEFINED;

    } else if (expression.is(Kind.BOOLEAN_LITERAL)) {
      value = booleanLiteral((LiteralTree) expression);

    } else if (expression.is(Kind.STRING_LITERAL)) {
      value = stringLiteral((LiteralTree) expression);

    } else if (expression.is(Kind.NUMERIC_LITERAL)) {
      value = numericLiteral((LiteralTree) expression);

    } else if (expression.is(Kind.IDENTIFIER_REFERENCE)) {
      IdentifierTree identifier = (IdentifierTree) expression;
      // TODO undefined may be used as an an identifier in a non-global scope
      if ("undefined".equals(identifier.name())) {
        value = NULL_OR_UNDEFINED;
      }

    }
    return value;
  }

  private static SymbolicValue booleanLiteral(LiteralTree expression) {
    return literal("true".equals(expression.value()));
  }

  private static SymbolicValue stringLiteral(LiteralTree expression) {
    return literal(expression.value().length() > 2);
  }

  private static SymbolicValue numericLiteral(LiteralTree expression) {
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

  public static SymbolicValue literal(boolean isTruthy) {
    return isTruthy ? TRUTHY_LITERAL : FALSY_LITERAL;
  }

  public Nullability nullability() {
    return nullability;
  }

  public Truthiness truthiness() {
    return truthiness;
  }

  public SymbolicValue constrain(Truthiness truthiness) {
    Nullability newNullability = nullability;
    if (truthiness.equals(Truthiness.TRUTHY)) {
      newNullability = Nullability.NOT_NULL;
    }
    return new SymbolicValue(newNullability, truthiness);
  }

  public SymbolicValue constrain(Nullability nullability) {
    Truthiness newTruthiness = truthiness;
    if (nullability.equals(Nullability.NULL)) {
      newTruthiness = Truthiness.FALSY;
    }
    return new SymbolicValue(nullability, newTruthiness);
  }

  @Override
  public int hashCode() {
    return Objects.hash(nullability, truthiness);
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null || getClass() != obj.getClass()) {
      return false;
    }
    SymbolicValue other = (SymbolicValue) obj;
    return Objects.equals(this.nullability, other.nullability) && Objects.equals(this.truthiness, other.truthiness);
  }

  @Override
  public String toString() {
    if (this.equals(NULL_OR_UNDEFINED)) {
      return "SV_NULL";

    } else if (this.equals(UNKNOWN)) {
      return "SV_UNKNOWN";

    } else if (this.equals(TRUTHY_LITERAL)) {
      return "SV_TRUTHY";

    } else if (this.equals(FALSY_LITERAL)) {
      return "SV_FALSY";

    } else {
      return "SV_" + nullability + "_" + truthiness;
    }
  }
}
