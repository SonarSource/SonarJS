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
package org.sonar.javascript.se.builtins;

import java.util.List;
import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue.ArgumentsConstrainer;
import org.sonar.javascript.se.sv.FunctionSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

import static org.sonar.javascript.se.Constraint.NAN;
import static org.sonar.javascript.se.Constraint.NULL;
import static org.sonar.javascript.se.Constraint.OTHER_OBJECT;
import static org.sonar.javascript.se.Constraint.TRUTHY;
import static org.sonar.javascript.se.Constraint.TRUTHY_NUMBER_PRIMITIVE;
import static org.sonar.javascript.se.Constraint.UNDEFINED;
import static org.sonar.javascript.se.Constraint.ZERO;

public enum BuiltInObjectSymbolicValue implements FunctionSymbolicValue {

  NUMBER("Number", Type.NUMBER_OBJECT),
  BOOLEAN("Boolean", Type.BOOLEAN_OBJECT),
  STRING("String", Type.STRING_OBJECT),
  FUNCTION("Function", Type.FUNCTION),
  DATE("Date", Type.DATE),
  REGEXP("RegExp", Type.REGEXP),
  ARRAY("Array", Type.ARRAY),
  OBJECT("Object", Type.OBJECT);

  private static final ArgumentsConstrainer IS_NAN_ARGUMENT_CONSTRAINER = (List<SymbolicValue> arguments, ProgramState state, Constraint constraint) -> {
    boolean truthy = constraint.isStricterOrEqualTo(TRUTHY);
    boolean hasArguments = !arguments.isEmpty();

    Constraint alwaysNaN = UNDEFINED.or(NAN).or(Constraint.FUNCTION).or(Constraint.REGEXP).or(OTHER_OBJECT);
    Constraint alwaysNotNaN = NULL.or(ZERO).or(Constraint.EMPTY_STRING_PRIMITIVE).or(Constraint.ANY_BOOLEAN).or(TRUTHY_NUMBER_PRIMITIVE);

    if (truthy && hasArguments) {
      return state.constrain(arguments.get(0), alwaysNotNaN.not());

    } else if (truthy) {
      return Optional.of(state);

    } else if (!hasArguments) {
      return Optional.empty();

    } else {
      return state.constrain(arguments.get(0), alwaysNaN.not());
    }
  };

  private static final SymbolicValue MATH_OBJECT = new MathBuiltInObjectSymbolicValue();

  private final String name;
  private final Type type;

  BuiltInObjectSymbolicValue(String name, Type type) {
    this.name = name;
    this.type = type;
  }

  public Type type() {
    return type;
  }

  @Override
  public Optional<SymbolicValue> getValueForOwnProperty(String name) {
    return type.getValueForOwnProperty(name);
  }

  @Override
  public SymbolicValue instantiate() {
    return new SymbolicValueWithConstraint(type.constraint());
  }

  @Override
  public SymbolicValue call(List<SymbolicValue> argumentValues) {
    if (this == DATE || this == STRING) {
      return new SymbolicValueWithConstraint(Constraint.STRING_PRIMITIVE);
    } else if (this == NUMBER) {
      return new SymbolicValueWithConstraint(Constraint.NUMBER_PRIMITIVE);
    } else if (this == BOOLEAN) {
      return new SymbolicValueWithConstraint(Constraint.BOOLEAN_PRIMITIVE);
    } else {
      return new SymbolicValueWithConstraint(type.constraint());
    }
  }

  public static Optional<SymbolicValue> find(String name) {
    for (BuiltInObjectSymbolicValue builtInObject : values()) {
      if (builtInObject.name.equals(name)) {
        return Optional.of(builtInObject);
      }
    }

    if ("Math".equals(name)) {
      return Optional.of(MATH_OBJECT);
    }

    if ("isNaN".equals(name)) {
      return Optional.of(new BuiltInFunctionSymbolicValue(Constraint.BOOLEAN_PRIMITIVE, IS_NAN_ARGUMENT_CONSTRAINER));
    }

    return Optional.empty();
  }
}
