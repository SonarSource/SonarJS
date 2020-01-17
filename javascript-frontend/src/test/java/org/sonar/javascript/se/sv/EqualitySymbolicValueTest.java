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
import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class EqualitySymbolicValueTest {

  Symbol symbol1 = mock(Symbol.class);
  Symbol symbol2 = mock(Symbol.class);
  ProgramState state = ProgramState.emptyState()
    .newSymbolicValue(symbol1, null)
    .newSymbolicValue(symbol2, null);
  SymbolicValue sv1 = state.getSymbolicValue(symbol1);
  SymbolicValue sv2 = state.getSymbolicValue(symbol2);
  final EqualitySymbolicValue equalTo = create(Tree.Kind.EQUAL_TO, sv1, sv2);
  final EqualitySymbolicValue strictEqualTo = create(Tree.Kind.STRICT_EQUAL_TO, sv1, sv2);
  final EqualitySymbolicValue notEqualTo = create(Tree.Kind.NOT_EQUAL_TO, sv1, sv2);
  final EqualitySymbolicValue strictNotEqualTo = create(Tree.Kind.STRICT_NOT_EQUAL_TO, sv1, sv2);

  @Test
  public void same_single_value_constraint_comparison() throws Exception {

    state = state.constrain(sv1, Constraint.EMPTY_STRING_PRIMITIVE).get()
      .constrain(sv2, Constraint.EMPTY_STRING_PRIMITIVE).get();

    assertThat(equalTo.baseConstraint(state)).isEqualTo(Constraint.TRUE);
    assertThat(strictEqualTo.baseConstraint(state)).isEqualTo(Constraint.TRUE);
    assertThat(notEqualTo.baseConstraint(state)).isEqualTo(Constraint.FALSE);
    assertThat(strictNotEqualTo.baseConstraint(state)).isEqualTo(Constraint.FALSE);
  }

  @Test
  public void different_single_value_constraint_comparison() throws Exception {

    state = state.constrain(sv1, Constraint.EMPTY_STRING_PRIMITIVE).get()
      .constrain(sv2, Constraint.ZERO).get();

    assertThat(equalTo.baseConstraint(state)).isEqualTo(Constraint.BOOLEAN_PRIMITIVE);
    assertThat(strictEqualTo.baseConstraint(state)).isEqualTo(Constraint.FALSE);
    assertThat(notEqualTo.baseConstraint(state)).isEqualTo(Constraint.BOOLEAN_PRIMITIVE);
    assertThat(strictNotEqualTo.baseConstraint(state)).isEqualTo(Constraint.TRUE);
  }

  @Test
  public void constrain_to_truthy_stops_for_different_single_value_constraints() throws Exception {
    state = state.constrain(sv1, Constraint.EMPTY_STRING_PRIMITIVE).get()
      .constrain(sv2, Constraint.ZERO).get();

    final Optional<ProgramState> constrainedState = strictEqualTo.constrainDependencies(state, Constraint.TRUTHY);
    assertThat(constrainedState.isPresent()).isFalse();
  }

  @Test
  public void constrained_strict_equal_propagates_single_value_constraints() throws Exception {
    state = state.constrain(sv1, Constraint.ANY_VALUE).get()
      .constrain(sv2, Constraint.EMPTY_STRING_PRIMITIVE).get();

    final Optional<ProgramState> stateConstrainedToTruthy = strictEqualTo.constrainDependencies(state, Constraint.TRUTHY);
    assertThat(stateConstrainedToTruthy.isPresent()).isTrue();
    assertThat(stateConstrainedToTruthy.get().getConstraint(sv1)).isEqualTo(Constraint.EMPTY_STRING_PRIMITIVE);
    final Optional<ProgramState> stateConstrainedToFalsy = strictEqualTo.constrainDependencies(state, Constraint.FALSY);
    assertThat(stateConstrainedToFalsy.isPresent()).isTrue();
    assertThat(stateConstrainedToFalsy.get().getConstraint(sv1)).isEqualTo(Constraint.EMPTY_STRING_PRIMITIVE.not());
  }

  @Test
  public void constrained_strict_not_equal_propagates_single_value_constraints() throws Exception {
    state = state.constrain(sv1, Constraint.FALSE).get()
      .constrain(sv2, Constraint.ANY_VALUE).get();

    final Optional<ProgramState> stateConstrainedToTruthy = strictNotEqualTo.constrainDependencies(state, Constraint.TRUTHY);
    assertThat(stateConstrainedToTruthy.isPresent()).isTrue();
    assertThat(stateConstrainedToTruthy.get().getConstraint(sv2)).isEqualTo(Constraint.FALSE.not());
    final Optional<ProgramState> stateConstrainedToFalsy = strictNotEqualTo.constrainDependencies(state, Constraint.FALSY);
    assertThat(stateConstrainedToFalsy.isPresent()).isTrue();
    assertThat(stateConstrainedToFalsy.get().getConstraint(sv2)).isEqualTo(Constraint.FALSE);
  }

  @Test
  public void constrained_loose_equal_not_propagates_single_value_constraints() throws Exception {
    state = state.constrain(sv1, Constraint.FALSE).get()
      .constrain(sv2, Constraint.ANY_VALUE).get();

    final Optional<ProgramState> stateConstrainedToTruthy = equalTo.constrainDependencies(state, Constraint.TRUTHY);
    assertThat(stateConstrainedToTruthy.isPresent()).isTrue();
    assertThat(stateConstrainedToTruthy.get().getConstraint(sv2)).isEqualTo(Constraint.ANY_VALUE);
    final Optional<ProgramState> stateConstrainedToFalsy = equalTo.constrainDependencies(state, Constraint.FALSY);
    assertThat(stateConstrainedToFalsy.isPresent()).isTrue();
    assertThat(stateConstrainedToFalsy.get().getConstraint(sv2)).isEqualTo(Constraint.ANY_VALUE);
  }

  @Test
  public void constrained_loose_not_equal_not_propagates_single_value_constraints() throws Exception {
    state = state.constrain(sv1, Constraint.FALSE).get()
      .constrain(sv2, Constraint.ANY_VALUE).get();

    final Optional<ProgramState> stateConstrainedToTruthy = notEqualTo.constrainDependencies(state, Constraint.TRUTHY);
    assertThat(stateConstrainedToTruthy.isPresent()).isTrue();
    assertThat(stateConstrainedToTruthy.get().getConstraint(sv2)).isEqualTo(Constraint.ANY_VALUE);
    final Optional<ProgramState> stateConstrainedToFalsy = notEqualTo.constrainDependencies(state, Constraint.FALSY);
    assertThat(stateConstrainedToFalsy.isPresent()).isTrue();
    assertThat(stateConstrainedToFalsy.get().getConstraint(sv2)).isEqualTo(Constraint.ANY_VALUE);
  }

  private EqualitySymbolicValue create(Tree.Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    return (EqualitySymbolicValue) RelationalSymbolicValue.create(kind, leftOperand, rightOperand);
  }

}
