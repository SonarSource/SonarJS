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
import org.sonar.javascript.se.Relation;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.sonar.javascript.se.sv.SpecialSymbolicValue.NULL;
import static org.sonar.javascript.se.sv.SpecialSymbolicValue.UNDEFINED;

public class RelationalSymbolicValueTest {

  Symbol symbol1 = mock(Symbol.class);
  Symbol symbol2 = mock(Symbol.class);
  ProgramState state = ProgramState.emptyState()
    .newSymbolicValue(symbol1, null)
    .newSymbolicValue(symbol2, null);
  SymbolicValue sv1 = state.getSymbolicValue(symbol1);
  SymbolicValue sv2 = state.getSymbolicValue(symbol2);
  RelationalSymbolicValue relationalValue = create(Kind.LESS_THAN, sv1, sv2);

  @Test
  public void constraint() {
    assertThat(relationalValue.baseConstraint(ProgramState.emptyState())).isEqualTo(Constraint.BOOLEAN_PRIMITIVE);
  }

  @Test
  public void constraint_on_equality() throws Exception {
    state = state
      .constrain(sv1, Constraint.TRUTHY).get()
      .constrain(sv2, Constraint.FALSY).get();
    assertThat(RelationalSymbolicValue.create(Kind.EQUAL_TO, sv1, sv2).baseConstraint(state)).isEqualTo(Constraint.BOOLEAN_PRIMITIVE);
    assertThat(RelationalSymbolicValue.create(Kind.NOT_EQUAL_TO, sv1, sv2).baseConstraint(state)).isEqualTo(Constraint.BOOLEAN_PRIMITIVE);
    assertThat(RelationalSymbolicValue.create(Kind.STRICT_EQUAL_TO, sv1, sv2).baseConstraint(state)).isEqualTo(Constraint.FALSE);
    assertThat(RelationalSymbolicValue.create(Kind.STRICT_NOT_EQUAL_TO, sv1, sv2).baseConstraint(state)).isEqualTo(Constraint.TRUE);
  }

  @Test
  public void relationWhenTrue() {
    assertThat(relationalValue.relationWhenTrue()).isEqualTo(new Relation(Kind.LESS_THAN, sv1, sv2));
  }

  @Test
  public void constrain_to_non_boolean_constraint() {
    assertThat(relationalValue.constrainDependencies(state, Constraint.STRING_PRIMITIVE.not()).get()).isEqualTo(state);
  }

  @Test
  public void constrain_to_truthy() {
    Optional<ProgramState> constrainedStates = relationalValue.constrainDependencies(state, Constraint.TRUTHY);
    assertThat(constrainedStates.isPresent()).isTrue();
    assertThat(constrainedStates.get().relations()).containsOnly(new Relation(Kind.LESS_THAN, sv1, sv2));
  }

  @Test
  public void constrain_to_falsy() {
    Optional<ProgramState> constrainedStates = relationalValue.constrainDependencies(state, Constraint.FALSY);
    assertThat(constrainedStates.isPresent()).isTrue();
    assertThat(constrainedStates.get().relations()).containsOnly(new Relation(Kind.GREATER_THAN_OR_EQUAL_TO, sv1, sv2));
  }

  @Test
  public void constrain_with_incompatible_relation() throws Exception {
    RelationalSymbolicValue lessThan = create(Kind.LESS_THAN, sv1, sv2);
    RelationalSymbolicValue greaterThan = create(Kind.GREATER_THAN, sv1, sv2);
    ProgramState constrainedState = lessThan.constrainDependencies(state, Constraint.TRUTHY).get();

    assertThat(greaterThan.constrainDependencies(constrainedState, Constraint.TRUTHY).isPresent()).isFalse();
    assertThat(lessThan.constrainDependencies(constrainedState, Constraint.FALSY).isPresent()).isFalse();
  }

  @Test
  public void constraint_on_value_itself_with_unknown_operand() throws Exception {
    RelationalSymbolicValue value = create(Kind.LESS_THAN, sv1, UnknownSymbolicValue.UNKNOWN);
    state = state.pushToStack(value).assignment(symbol2);
    Optional<ProgramState> constrainedStates = state.constrain(value, Constraint.TRUE);
    assertThat(constrainedStates.isPresent()).isTrue();
    ProgramState constrainedState = constrainedStates.get();
    assertThat(constrainedState.constrain(value, Constraint.FALSE).isPresent()).isFalse();
  }

  @Test
  public void null_or_undefined_operand() throws Exception {
    assertThat(
      singleConstrainedState(create(Kind.LESS_THAN, sv1, NULL), Constraint.TRUTHY)
        .getConstraint(sv1)).isEqualTo(Constraint.ANY_VALUE);

    assertThat(
      singleConstrainedState(create(Kind.EQUAL_TO, sv1, NULL), Constraint.TRUTHY)
        .getConstraint(sv1)).isEqualTo(Constraint.NULL_OR_UNDEFINED);
    assertThat(
      singleConstrainedState(create(Kind.EQUAL_TO, sv1, NULL), Constraint.FALSY)
        .getConstraint(sv1)).isEqualTo(Constraint.NOT_NULLY);
    assertThat(
      singleConstrainedState(create(Kind.NOT_EQUAL_TO, sv1, NULL), Constraint.TRUTHY)
        .getConstraint(sv1)).isEqualTo(Constraint.NOT_NULLY);
    assertThat(
      singleConstrainedState(create(Kind.EQUAL_TO, UNDEFINED, sv2), Constraint.TRUTHY)
        .getConstraint(sv2)).isEqualTo(Constraint.NULL_OR_UNDEFINED);

    assertThat(
      singleConstrainedState(create(Kind.STRICT_EQUAL_TO, sv1, NULL), Constraint.TRUTHY)
        .getConstraint(sv1)).isEqualTo(Constraint.NULL);
  }

  @Test
  public void test_false_numeric_comparison() throws Exception {
    state = state
      .constrain(sv1, Constraint.POSITIVE_NUMBER_PRIMITIVE).get()
      .constrain(sv2, Constraint.NEGATIVE_NUMBER_PRIMITIVE).get();

    assertThat(relationalValue.baseConstraint(state)).isEqualTo(Constraint.FALSE);
  }

  @Test
  public void test_true_numeric_comparison() throws Exception {
    state = state
      .constrain(sv1, Constraint.NEGATIVE_NUMBER_PRIMITIVE).get()
      .constrain(sv2, Constraint.POSITIVE_NUMBER_PRIMITIVE).get();

    assertThat(relationalValue.baseConstraint(state)).isEqualTo(Constraint.TRUE);
  }

  @Test
  public void test_unknown_numeric_comparison() throws Exception {
    state = state
      .constrain(sv1, Constraint.NEGATIVE_NUMBER_PRIMITIVE).get()
      .constrain(sv2, Constraint.NEGATIVE_NUMBER_PRIMITIVE).get();

    assertThat(relationalValue.baseConstraint(state)).isEqualTo(Constraint.BOOLEAN_PRIMITIVE);
  }

  private ProgramState singleConstrainedState(SymbolicValue value, Constraint constraint) {
    Optional<ProgramState> constrainedStates = value.constrainDependencies(state, constraint);
    assertThat(constrainedStates.isPresent()).isTrue();
    return constrainedStates.get();
  }

  private RelationalSymbolicValue create(Kind kind, SymbolicValue leftOperand, SymbolicValue rightOperand) {
    return (RelationalSymbolicValue) RelationalSymbolicValue.create(kind, leftOperand, rightOperand);
  }

}
