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

import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.sv.FunctionSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

public enum BuiltInObjectSymbolicValue implements FunctionSymbolicValue {

  NUMBER("Number", Type.NUMBER),
  BOOLEAN("Boolean", Type.BOOLEAN),
  STRING("String", Type.STRING),
  FUNCTION("Function", Type.FUNCTION),
  DATE("Date", Type.DATE),
  REGEXP("RegExp", Type.REGEXP),
  ARRAY("Array", Type.ARRAY),
  OBJECT("Object", Type.OBJECT);

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
  public SymbolicValue call() {
    if (this == DATE) {
      return new SymbolicValueWithConstraint(Constraint.STRING);
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

    return Optional.empty();
  }
}
