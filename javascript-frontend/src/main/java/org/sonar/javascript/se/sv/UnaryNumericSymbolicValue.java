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
package org.sonar.javascript.se.sv;

import com.google.common.collect.HashBasedTable;
import com.google.common.collect.Table;
import java.util.Optional;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.tree.impl.JavaScriptTree;
import org.sonar.plugins.javascript.api.tree.Tree;
import org.sonar.plugins.javascript.api.tree.expression.UnaryExpressionTree;

import static org.sonar.javascript.se.Constraint.*;
import static org.sonar.plugins.javascript.api.tree.Tree.Kind.*;

public class UnaryNumericSymbolicValue implements SymbolicValue {

  private final UnaryExpressionTree element;

  private static final Table<Tree.Kind, Constraint, Constraint> CONSTRAINT_TRANSITIONS = HashBasedTable.create();
  private final SymbolicValue operandValue;

  public UnaryNumericSymbolicValue(UnaryExpressionTree element, SymbolicValue operandValue) {
    this.element = element;
    this.operandValue = operandValue;
  }

  @Override
  public Optional<ProgramState> constrainDependencies(ProgramState state, Constraint constraint) {
    return Optional.of(state);
  }

  @Override
  public Constraint baseConstraint(ProgramState state) {
    Tree.Kind kind = ((JavaScriptTree) element).getKind();
    Constraint constraint = CONSTRAINT_TRANSITIONS.get(kind, state.getConstraint(operandValue));
    if (constraint == null) {
      return NUMBER_PRIMITIVE;
    }
    return constraint;
  }

  static {
    // operation kind operand constraint resulting constraint
    CONSTRAINT_TRANSITIONS.put(UNARY_MINUS, POSITIVE_NUMBER_PRIMITIVE, NEGATIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(UNARY_MINUS, NEGATIVE_NUMBER_PRIMITIVE, POSITIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(UNARY_MINUS, ZERO, ZERO);
    CONSTRAINT_TRANSITIONS.put(UNARY_MINUS, NAN, NAN);

    CONSTRAINT_TRANSITIONS.put(PREFIX_INCREMENT, POSITIVE_NUMBER_PRIMITIVE, POSITIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(PREFIX_INCREMENT, NEGATIVE_NUMBER_PRIMITIVE, NEGATIVE_NUMBER_PRIMITIVE.or(ZERO));
    CONSTRAINT_TRANSITIONS.put(PREFIX_INCREMENT, ZERO, POSITIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(PREFIX_INCREMENT, NAN, NAN);

    CONSTRAINT_TRANSITIONS.put(PREFIX_DECREMENT, POSITIVE_NUMBER_PRIMITIVE, POSITIVE_NUMBER_PRIMITIVE.or(ZERO));
    CONSTRAINT_TRANSITIONS.put(PREFIX_DECREMENT, NEGATIVE_NUMBER_PRIMITIVE, NEGATIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(PREFIX_DECREMENT, ZERO, NEGATIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(PREFIX_DECREMENT, NAN, NAN);

    CONSTRAINT_TRANSITIONS.put(POSTFIX_INCREMENT, POSITIVE_NUMBER_PRIMITIVE, POSITIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(POSTFIX_INCREMENT, NEGATIVE_NUMBER_PRIMITIVE, NEGATIVE_NUMBER_PRIMITIVE.or(ZERO));
    CONSTRAINT_TRANSITIONS.put(POSTFIX_INCREMENT, ZERO, POSITIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(POSTFIX_INCREMENT, NAN, NAN);

    CONSTRAINT_TRANSITIONS.put(POSTFIX_DECREMENT, POSITIVE_NUMBER_PRIMITIVE, POSITIVE_NUMBER_PRIMITIVE.or(ZERO));
    CONSTRAINT_TRANSITIONS.put(POSTFIX_DECREMENT, NEGATIVE_NUMBER_PRIMITIVE, NEGATIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(POSTFIX_DECREMENT, ZERO, NEGATIVE_NUMBER_PRIMITIVE);
    CONSTRAINT_TRANSITIONS.put(POSTFIX_DECREMENT, NAN, NAN);

  }
}
