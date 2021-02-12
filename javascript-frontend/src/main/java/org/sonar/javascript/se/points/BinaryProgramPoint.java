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
package org.sonar.javascript.se.points;

import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ExpressionStack;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.SymbolicValue;

public abstract class BinaryProgramPoint implements ProgramPoint {
  private Constraint firstOperandConstraint;
  private Constraint secondOperandConstraint;

  @Override
  public final Optional<ProgramState> execute(ProgramState state) {
    return Optional.of(transformState(state));
  }

  private ProgramState transformState(ProgramState state) {
    ExpressionStack stack = state.getStack();

    ExpressionStack stackAfterExecution = stack.apply(newStack -> {
      final SymbolicValue secondOperandValue = newStack.pop();
      this.secondOperandConstraint = state.getConstraint(secondOperandValue);
      final SymbolicValue firstOperandValue = newStack.pop();
      this.firstOperandConstraint = state.getConstraint(firstOperandValue);
      newStack.push(resolveValue(firstOperandConstraint, secondOperandConstraint, firstOperandValue, secondOperandValue));
    });
    return state.withStack(stackAfterExecution);
  }

  public Constraint resultingConstraint(ProgramState currentState) {
    ProgramState newPS = this.transformState(currentState);
    return newPS.getConstraint(newPS.peekStack());
  }

  // This method signature should be simplified: either we keep operand constraints or values.
  // In order to make this decision, we should carefully consider design on symbolic execution.
  // In particular define the responsibilities of "ProgramPoint", "SymbolicValue" and "ProgramPointExecution" (doesn't exist yet). 
  protected abstract SymbolicValue resolveValue(Constraint firstOperandConstraint, Constraint secondOperandConstraint, @Deprecated SymbolicValue firstOperandValue,
    @Deprecated SymbolicValue secondOperandValue);

  /**
   * NOTE This method should be called only after {@link BinaryProgramPoint#resultingConstraint(ProgramState)} or {@link BinaryProgramPoint#execute(ProgramState)}
   */
  public Constraint firstOperandConstraint() {
    return firstOperandConstraint;
  }

  /**
   * NOTE This method should be called only after {@link BinaryProgramPoint#resultingConstraint(ProgramState)} or {@link BinaryProgramPoint#execute(ProgramState)}
   */
  public Constraint secondOperandConstraint() {
    return secondOperandConstraint;
  }

}
