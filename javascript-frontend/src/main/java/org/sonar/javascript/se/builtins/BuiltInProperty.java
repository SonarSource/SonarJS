/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.javascript.se.builtins;

import com.google.common.collect.ImmutableList;
import java.util.List;
import java.util.Optional;
import java.util.function.IntFunction;
import javax.annotation.Nullable;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue.ArgumentsConstrainer;
import org.sonar.javascript.se.sv.BuiltInFunctionSymbolicValue.ListSignature;
import org.sonar.javascript.se.sv.FunctionSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;

import static org.sonar.javascript.se.Constraint.TRUTHY;

abstract class BuiltInProperty {

  public static final List<Constraint> ONE_NUMBER = ImmutableList.of(Constraint.ANY_NUMBER);
  public static final List<Constraint> STRING_NUMBER = ImmutableList.of(Constraint.ANY_STRING, Constraint.ANY_NUMBER);
  public static final List<Constraint> NUMBER_STRING = ImmutableList.of(Constraint.ANY_NUMBER, Constraint.ANY_STRING);
  public static final List<Constraint> NUMBER_NUMBER = ImmutableList.of(Constraint.ANY_NUMBER, Constraint.ANY_NUMBER);
  public static final List<Constraint> EMPTY = ImmutableList.of();
  public static final List<Constraint> ONE_STRING = ImmutableList.of(Constraint.ANY_STRING);

  public static final IntFunction<Constraint> TO_LOCALE_STRING_SIGNATURE = (int parameterIndex) -> {
    switch (parameterIndex) {
      case 0:
        return Constraint.ANY_STRING.or(Constraint.ARRAY);
      case 1:
        return Constraint.OBJECT;
      default:
        return null;
    }
  };

  public abstract SymbolicValue access();

  public static BuiltInProperty property(Constraint constraint) {
    return new MutableBuiltinProperty(constraint);
  }

  public static Constraint constraintOnRecentProperty(Constraint baseConstraint) {
    return baseConstraint.or(Constraint.UNDEFINED);
  }

  protected static BuiltInProperty method(Constraint returnConstraint) {
    return method(new BuiltInFunctionSymbolicValue(returnConstraint));
  }

  protected static BuiltInProperty method(Constraint returnConstraint, List<Constraint> parameterTypes) {
    return method(returnConstraint, null, parameterTypes, false);
  }

  protected static BuiltInProperty method(Constraint returnConstraint, List<Constraint> parameterTypes, boolean hasSideEffect) {
    return method(returnConstraint, null, parameterTypes, hasSideEffect);
  }

  protected static BuiltInProperty method(
    Constraint returnConstraint,
    IntFunction<Constraint> signature) {
    return method(new BuiltInFunctionSymbolicValue(returnConstraint, signature, false));
  }

  protected static BuiltInProperty method(
    Constraint returnConstraint,
    IntFunction<Constraint> signature,
    boolean hasSideEffect) {
    return method(new BuiltInFunctionSymbolicValue(returnConstraint, signature, hasSideEffect));
  }

  protected static BuiltInProperty method(
    Constraint returnConstraint,
    @Nullable ArgumentsConstrainer argumentsConstrainer,
    List<Constraint> parameterTypes) {

    return method(new BuiltInFunctionSymbolicValue(returnConstraint, argumentsConstrainer, new ListSignature(parameterTypes), false));
  }

  protected static BuiltInProperty method(
    Constraint returnConstraint,
    @Nullable ArgumentsConstrainer argumentsConstrainer,
    List<Constraint> parameterTypes,
    boolean hasSideEffect) {

    return method(new BuiltInFunctionSymbolicValue(returnConstraint, argumentsConstrainer, new ListSignature(parameterTypes), hasSideEffect));
  }

  private static BuiltInProperty method(BuiltInFunctionSymbolicValue builtInFunctionSymbolicValue) {
    return new BuiltinMethod(builtInFunctionSymbolicValue);
  }

  private static class MutableBuiltinProperty extends BuiltInProperty {

    private final Constraint constraint;

    public MutableBuiltinProperty(Constraint constraint) {
      this.constraint = constraint;
    }

    @Override
    public SymbolicValue access() {
      return new SymbolicValueWithConstraint(constraint);
    }

  }

  private static class BuiltinMethod extends BuiltInProperty {

    private final FunctionSymbolicValue function;

    public BuiltinMethod(BuiltInFunctionSymbolicValue functionSymbolicValue) {
      this.function = functionSymbolicValue;
    }

    @Override
    public SymbolicValue access() {
      return function;
    }

  }

  public static ArgumentsConstrainer getIsSomethingArgumentsConstrainer(Constraint logicConstraint) {
    return (List<SymbolicValue> arguments, ProgramState state, Constraint constraint) -> {
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
