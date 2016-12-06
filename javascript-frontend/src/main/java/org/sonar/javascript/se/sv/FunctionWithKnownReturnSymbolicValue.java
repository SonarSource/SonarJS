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
package org.sonar.javascript.se.sv;

import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

/**
 * This symbolic values is used for built-in types and objects methods. Note, that as many of such methods are not supported by all browsers (as they are deprecated or new),
 * {@link FunctionWithKnownReturnSymbolicValue#baseConstraint(ProgramState)} will return <code>Constraint.FUNCTION.or(Constraint.UNDEFINED)</code>.
 */
public class FunctionWithKnownReturnSymbolicValue implements FunctionSymbolicValue {

  private final FunctionBehaviour functionBehaviour;

  public FunctionWithKnownReturnSymbolicValue(Constraint returnedValueConstraint) {
    this.functionBehaviour = (Constraint ... argumentConstraints) -> returnedValueConstraint;
  }

  public FunctionWithKnownReturnSymbolicValue(FunctionBehaviour functionBehaviour) {
    this.functionBehaviour = functionBehaviour;
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
  public SymbolicValue call(Constraint ... argumentConstraints) {
    return new SymbolicValueWithConstraint(functionBehaviour.call(argumentConstraints));
  }

  @FunctionalInterface
  public interface FunctionBehaviour {
    Constraint call(Constraint ... argumentConstraints);
  }
}
