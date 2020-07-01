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
package org.sonar.javascript.se.sv;

import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.Type;
import org.sonar.javascript.se.builtins.BuiltInConstructorSymbolicValue;
import org.sonar.javascript.se.builtins.BuiltInObjectSymbolicValue;

/**
 * This class represents symbolic value for "instanceof" expression.
 * E.g.
 * <pre>typeof foo.bar()</pre>
 * <pre>typeof x</pre>
 */
public class InstanceOfSymbolicValue implements SymbolicValue {

  private static final Constraint PRIMITIVE = Constraint.NUMBER_PRIMITIVE.or(Constraint.BOOLEAN_PRIMITIVE).or(Constraint.STRING_PRIMITIVE);

  private final SymbolicValue objectValue;
  private final SymbolicValue constructorValue;

  public InstanceOfSymbolicValue(SymbolicValue objectValue, SymbolicValue constructorValue) {
    this.objectValue = objectValue;
    this.constructorValue = constructorValue;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    Optional<ProgramState> newProgramState;
    Constraint constraintForObject = null;
    if (BuiltInObjectSymbolicValue.OBJECT.equals(constructorValue)) {
      constraintForObject = Constraint.OBJECT;
    } else if (constructorValue instanceof BuiltInConstructorSymbolicValue) {
      constraintForObject = ((BuiltInConstructorSymbolicValue) constructorValue).getPrototypeOfInstances().baseConstraint();
    }

    if (constraint.isStricterOrEqualTo(Constraint.TRUTHY)) {
      newProgramState = state.constrain(objectValue, constraintForObject == null ? Constraint.NOT_NULLY : constraintForObject);

    } else {
      constraintForObject = constraintForObject == null || constraintForObject.equals(Constraint.OBJECT) ? Constraint.ANY_VALUE : constraintForObject.not();
      newProgramState = state.constrain(objectValue, constraintForObject);
    }

    return newProgramState;
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    Constraint objectConstraint = state.getConstraint(objectValue);

    if (objectConstraint.isStricterOrEqualTo(PRIMITIVE)) {
      return Constraint.FALSE;
    }

    Type objectType = objectConstraint.type();

    if (objectType == null || !(constructorValue instanceof BuiltInConstructorSymbolicValue) || Constraint.OTHER_OBJECT.isStricterOrEqualTo(objectConstraint)) {
      return Constraint.BOOLEAN_PRIMITIVE;
    }

    BuiltInObjectSymbolicValue prototype = objectType.prototype();
    while (prototype != null) {
      if (prototype.equals(((BuiltInConstructorSymbolicValue) constructorValue).getPrototypeOfInstances())) {
        return Constraint.TRUE;
      }
      prototype = prototype.prototype();
    }
    return Constraint.FALSE;
  }

  @Override
  public String toString() {
    return objectValue + " instanceof " + constructorValue;
  }
}
