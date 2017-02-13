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

import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ExpressionStack;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SymbolicExecution;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.UnaryNumericSymbolicValue;
import org.sonar.javascript.tree.KindSet;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;

public class UnaryNumericProgramPoint implements ProgramPoint {
  private UnaryExpressionTree element;
  private Constraint operandConstraint;
  private SymbolicValue operandValue;
  private SymbolicExecution execution;

  public UnaryNumericProgramPoint(Tree element, SymbolicExecution execution) {
    this.element = (UnaryExpressionTree) element;
    this.execution = execution;
  }

  @Override
  public Optional<ProgramState> execute(ProgramState state) {
    ExpressionStack stack = state.getStack();

    ExpressionStack stackAfterExecution = stack.apply(newStack -> {
      this.operandValue = newStack.pop();
      this.operandConstraint = state.getConstraint(operandValue);
      newStack.push(stackValue());
    });

    ProgramState newPS = state.withStack(stackAfterExecution);
    newPS = executeAssignment(newPS);

    return Optional.of(newPS);
  }

  private ProgramState executeAssignment(ProgramState state) {
    ProgramState newPS = state;

    if (element.is(KindSet.INC_DEC_KINDS)) {
      Symbol symbol = execution.trackedVariable(element.expression());
      if (symbol != null) {
        newPS = newPS.assignment(symbol, assignmentValue(newPS));
      }
    }

    return newPS;
  }

  private SymbolicValue assignmentValue(ProgramState state) {
    if (element.is(Kind.PREFIX_INCREMENT, Kind.PREFIX_DECREMENT)) {
      return state.peekStack();

    } else {
      return new UnaryNumericSymbolicValue(element, operandValue);
    }

  }

  private SymbolicValue stackValue() {
    if (element.is(Kind.POSTFIX_DECREMENT, Kind.POSTFIX_INCREMENT, Kind.UNARY_PLUS) && operandConstraint.isStricterOrEqualTo(Constraint.NUMBER_PRIMITIVE)) {
      return operandValue;
    }
    return new UnaryNumericSymbolicValue(element, operandValue);
  }

  public static boolean originatesFrom(Tree element) {
    return element.is(
      Kind.UNARY_PLUS,
      Kind.UNARY_MINUS,
      KindSet.INC_DEC_KINDS);
  }
}
