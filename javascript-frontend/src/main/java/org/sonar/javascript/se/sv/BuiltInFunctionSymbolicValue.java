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
package org.sonar.javascript.se.sv;

import java.util.List;
import java.util.Optional;
import java.util.function.IntFunction;
import javax.annotation.CheckForNull;
import javax.annotation.Nullable;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

/**
 * This symbolic values is used for built-in types and objects methods. Note, that as many of such methods are not supported by all browsers (as they are deprecated or new),
 * {@link BuiltInFunctionSymbolicValue#baseConstraint(ProgramState)} will return <code>Constraint.FUNCTION.or(Constraint.UNDEFINED)</code>.
 */
public class BuiltInFunctionSymbolicValue implements FunctionSymbolicValue {

  private final Constraint returnedValueConstraint;
  private final ArgumentsConstrainer argumentsConstrainer;
  private final IntFunction<Constraint> signature;
  private final boolean hasSideEffect;

  public BuiltInFunctionSymbolicValue(Constraint returnedValueConstraint, IntFunction<Constraint> signature) {
    this(returnedValueConstraint, null, signature, false);
  }

  public BuiltInFunctionSymbolicValue(Constraint returnedValueConstraint, IntFunction<Constraint> signature, boolean hasSideEffect) {
    this(returnedValueConstraint, null, signature, hasSideEffect);
  }

  public BuiltInFunctionSymbolicValue(Constraint returnedValueConstraint) {
    this(returnedValueConstraint, null, null, false);
  }

  public BuiltInFunctionSymbolicValue(
    Constraint returnedValueConstraint,
    @Nullable ArgumentsConstrainer argumentsConstrainer,
    @Nullable IntFunction<Constraint> signature,
    boolean hasSideEffect) {

    this.returnedValueConstraint = returnedValueConstraint;
    this.argumentsConstrainer = argumentsConstrainer;
    this.signature = signature;
    this.hasSideEffect = hasSideEffect;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    return Constraint.FUNCTION.or(Constraint.UNDEFINED);
  }

  @Override
  public SymbolicValue call(List<SymbolicValue> argumentValues) {
    if (argumentsConstrainer == null) {
      return new SymbolicValueWithConstraint(returnedValueConstraint);
    }
    return new ReturnSymbolicValue(argumentValues);
  }

  @CheckForNull
  public IntFunction<Constraint> signature() {
    return signature;
  }

  public boolean hasSideEffect() {
    return hasSideEffect;
  }

  @FunctionalInterface
  public interface ArgumentsConstrainer {
    Optional<ProgramState> constrain(List<SymbolicValue> arguments, ProgramState state, Constraint constraint);
  }

  private class ReturnSymbolicValue implements SymbolicValue {

    List<SymbolicValue> arguments;

    ReturnSymbolicValue(List<SymbolicValue> argumentValues) {
      this.arguments = argumentValues;
    }

    @Override
    public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
      return argumentsConstrainer.constrain(arguments, state, constraint);
    }

    @Override
    public Constraint baseConstraint(ProgramState state) {
      return returnedValueConstraint;
    }
  }

  public static class ListSignature implements IntFunction<Constraint> {
    private List<Constraint> parameterTypes;

    public ListSignature(List<Constraint> parameterTypes) {
      this.parameterTypes = parameterTypes;
    }

    @Override
    public Constraint apply(int parameterIndex) {
      if (parameterIndex < parameterTypes.size()) {
        return parameterTypes.get(parameterIndex);
      }

      return null;
    }
  }
}
