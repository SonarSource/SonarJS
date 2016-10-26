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
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.sv.ObjectSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

public enum BuiltInObjectSymbolicValue implements ObjectSymbolicValue {

  NUMBER("Number", Type.NUMBER),
  BOOLEAN("Boolean", Type.BOOLEAN),
  STRING("String", Type.STRING),
  FUNCTION("Function", Type.FUNCTION),
  DATE("Date", Type.DATE),
  OBJECT("Object", Type.OBJECT);

  private final String name;
  private final Type type;

  BuiltInObjectSymbolicValue(String name, Type type) {
    this.name = name;
    this.type = type;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    return Constraint.FUNCTION;
  }

  @Override
  public Optional<SymbolicValue> getValueForOwnProperty(String name) {
    Constraint constraint = type.builtInProperties().getOwnPropertiesConstraints().get(name);
    if (constraint != null) {
      return Optional.of(new SymbolicValueWithConstraint(constraint));
    }

    SymbolicValue value = type.builtInProperties().getOwnMethods().get(name);
    if (value != null) {
      return Optional.of(value);
    }

    return Optional.empty();
  }

  public SymbolicValue instantiate() {
    return new SymbolicValueWithConstraint(type.constraint());
  }

  public static Optional<BuiltInObjectSymbolicValue> find(String name) {
    for (BuiltInObjectSymbolicValue builtInObject : values()) {
      if (builtInObject.name.equals(name)) {
        return Optional.of(builtInObject);
      }
    }

    return Optional.empty();
  }
}
