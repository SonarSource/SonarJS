/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2017 SonarSource SA
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

import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ExpressionStack;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.PlusSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.plugins.javascript.api.tree.Tree;

public class PlusProgramPoint extends BinaryProgramPoint {

  private Constraint firstOperandConstraint;
  private Constraint secondOperandConstraint;

  @Override
  public ProgramState execute(ProgramState state) {
    ExpressionStack stack = state.getStack();
    ExpressionStack stackAfterExecution = stack.apply(newStack -> {
      final SymbolicValue secondOperandValue = newStack.pop();
      secondOperandConstraint = state.getConstraint(secondOperandValue);
      final SymbolicValue firstOperandValue = newStack.pop();
      firstOperandConstraint = state.getConstraint(firstOperandValue);
      newStack.push(resolveValue(firstOperandConstraint, secondOperandConstraint, firstOperandValue, secondOperandValue));
    });
    return state.withStack(stackAfterExecution);
  }

  @Override
  public SymbolicValue resolveValue(Constraint firstOperandConstraint, Constraint secondOperandConstraint, SymbolicValue firstOperandValue, SymbolicValue secondOperandValue) {
    return new PlusSymbolicValue(firstOperandValue, secondOperandValue);
  }

  @Override
  public Constraint firstOperandConstraint() {
    return firstOperandConstraint;
  }

  @Override
  public Constraint secondOperandConstraint() {
    return secondOperandConstraint;
  }

  public static boolean originatesFrom(Tree element) {
    return element.is(Tree.Kind.PLUS, Tree.Kind.PLUS_ASSIGNMENT);
  }

}
