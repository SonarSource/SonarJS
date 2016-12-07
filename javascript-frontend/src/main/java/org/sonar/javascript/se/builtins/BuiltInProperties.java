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
import java.util.Map;
import java.util.Optional;
import java.util.function.IntFunction;
import javax.annotation.Nullable;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue.ArgumentsConstrainer;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue.ListSignature;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

import static org.sonar.javascript.se.Constraint.TRUTHY;

public abstract class BuiltInProperties {

  abstract Map<String, Constraint> getPropertiesConstraints();

  abstract Map<String, SymbolicValue> getMethods();

  abstract Map<String, Constraint> getOwnPropertiesConstraints();

  abstract Map<String, SymbolicValue> getOwnMethods();

  @Nullable
  public SymbolicValue getValueForProperty(String propertyName) {

    Constraint constraint = getPropertiesConstraints().get(propertyName);
    if (constraint != null) {
      return new SymbolicValueWithConstraint(constraint);
    }

    SymbolicValue value = getMethods().get(propertyName);
    if (value != null) {
      return value;
    }

    return null;
  }

  public Optional<SymbolicValue> getValueForOwnProperty(String name) {
    Constraint constraint = getOwnPropertiesConstraints().get(name);
    if (constraint != null) {
      return Optional.of(new SymbolicValueWithConstraint(constraint));
    }

    SymbolicValue value = getOwnMethods().get(name);
    if (value != null) {
      return Optional.of(value);
    }

    return Optional.empty();
  }

  protected static BuiltInFunctionSymbolicValue method(Constraint returnConstraint) {
    return new BuiltInFunctionSymbolicValue(returnConstraint);
  }

  protected static BuiltInFunctionSymbolicValue method(Constraint returnConstraint, List<Constraint> parameterTypes) {
    return method(returnConstraint, null, parameterTypes);
  }

  protected static BuiltInFunctionSymbolicValue method(Constraint returnConstraint, IntFunction<Constraint> signature) {
    return new BuiltInFunctionSymbolicValue(returnConstraint, signature);
  }

  protected static BuiltInFunctionSymbolicValue method(Constraint returnConstraint, @Nullable ArgumentsConstrainer argumentsConstrainer, List<Constraint> parameterTypes) {
    return new BuiltInFunctionSymbolicValue(returnConstraint, argumentsConstrainer, new ListSignature(parameterTypes));
  }

  protected static Constraint constraintOnRecentProperty(Constraint baseConstraint) {
    return baseConstraint.or(Constraint.UNDEFINED);
  }

  public static ArgumentsConstrainer getIsSomethingArgumentsConstrainer(Constraint logicConstraint) {
    return  (List<SymbolicValue> arguments, ProgramState state, Constraint constraint) -> {
      boolean truthy = constraint.isStricterOrEqualTo(TRUTHY);
      boolean hasArguments = !arguments.isEmpty();

      if (truthy && !hasArguments) {
        return Optional.empty();

      } else if (truthy) {
        return state.constrain(arguments.get(0), logicConstraint);

      } else if (!hasArguments) {
        return Optional.of(state);

      } else {
        return state.constrain(arguments.get(0), logicConstraint.not());
      }
    };
  }
}
