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
package org.sonar.javascript.se;

import org.junit.Test;
import org.sonar.javascript.se.sv.SpecialSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ProgramStateTest {

  private final Symbol symbol1 = new Symbol("symbol1", Kind.VARIABLE, null);
  private final Symbol symbol2 = new Symbol("symbol2", Kind.VARIABLE, null);
  private ProgramState state = ProgramState.emptyState();

  @Test
  public void addValue() throws Exception {
    Constraint constraint1 = Constraint.NULL;
    Constraint constraint2 = Constraint.NULL.not();
    Constraint constraint3 = Constraint.FALSY;
    ProgramState state1 = state.newSymbolicValue(symbol1, constraint1);
    ProgramState state2 = state1
      .newSymbolicValue(symbol1, constraint2)
      .newSymbolicValue(symbol2, constraint3);

    assertThat(state.getConstraint(symbol1)).isEqualTo(Constraint.ANY_VALUE);
    assertThat(state1.getConstraint(symbol1)).isEqualTo(constraint1);
    assertThat(state2.getConstraint(symbol1)).isEqualTo(constraint2);
    assertThat(state2.getConstraint(symbol2)).isEqualTo(constraint3);
  }

  @Test
  public void constrain() throws Exception {
    state = state.newSymbolicValue(symbol1, null);
    SymbolicValue sv1 = state.getSymbolicValue(symbol1);
    SymbolicValue sv2 = state.getSymbolicValue(symbol2);
    assertThat(state.constrain(sv1, Constraint.FALSY).get().getConstraint(symbol1).isStricterOrEqualTo(Constraint.FALSY)).isTrue();
    assertThat(sv2).isNull();
    assertThat(state.constrain(sv2, Constraint.FALSY).get().getConstraint(symbol2)).isEqualTo(Constraint.ANY_VALUE);

    state = state.newSymbolicValue(symbol1, Constraint.NULL_OR_UNDEFINED);
    assertThat(state.constrain(state.getSymbolicValue(symbol1), Constraint.TRUTHY).isPresent()).isFalse();

    state = state.newSymbolicValue(symbol2, null);
    state = state.constrain(state.getSymbolicValue(symbol2), Constraint.TRUTHY).get();
    assertThat(state.constrain(state.getSymbolicValue(symbol2), Constraint.NULL).isPresent()).isFalse();
  }

  @Test
  public void getConstraint() {
    SymbolicValue sv1 = mock(SymbolicValue.class);
    state = state.pushToStack(sv1).assignment(symbol1).removeLastValue();

    when(sv1.baseConstraint(state)).thenReturn(Constraint.ANY_VALUE);
    assertThat(state.getConstraint(sv1)).isEqualTo(Constraint.ANY_VALUE);

    when(sv1.baseConstraint(state)).thenReturn(Constraint.BOOLEAN_PRIMITIVE);
    assertThat(state.getConstraint(sv1)).isEqualTo(Constraint.BOOLEAN_PRIMITIVE);

    SymbolicValue sv2 = new SymbolicValueWithConstraint(Constraint.BOOLEAN_PRIMITIVE);
    state = state.pushToStack(sv2).assignment(symbol1).removeLastValue();
    state = state.constrain(sv2, Constraint.TRUTHY).get();
    assertThat(state.getConstraint(sv2)).isEqualTo(Constraint.TRUE);
  }

  @Test
  public void test_equals() throws Exception {
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isEqualTo(state.newSymbolicValue(symbol1, Constraint.NULL));
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isNotEqualTo(state.newSymbolicValue(symbol1, Constraint.UNDEFINED.not()));
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isNotEqualTo(null);
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isNotEqualTo("");
    assertThat(
      state.pushToStack(SpecialSymbolicValue.NULL).assignment(symbol1).removeLastValue())
    .isNotEqualTo(
      state.pushToStack(SpecialSymbolicValue.UNDEFINED).assignment(symbol1).removeLastValue());

    state = state
      .newSymbolicValue(symbol1, null)
      .newSymbolicValue(symbol2, null);
    SymbolicValue sv1 = state.getSymbolicValue(symbol1);
    SymbolicValue sv2 = state.getSymbolicValue(symbol2);
    assertThat(state).isNotEqualTo(state.addRelation(new Relation(Tree.Kind.LESS_THAN, sv1, sv2)));
  }

  @Test
  public void test_equals_with_reused_symbolic_values() throws Exception {
    ProgramState stateWithReusedSV = state.newSymbolicValue(symbol1, Constraint.ANY_VALUE);
    stateWithReusedSV = stateWithReusedSV.assignment(symbol2, stateWithReusedSV.getSymbolicValue(symbol1));

    ProgramState stateWithSingleUseSV = state.newSymbolicValue(symbol1, Constraint.ANY_VALUE).newSymbolicValue(symbol2, Constraint.ANY_VALUE);

    assertThat(stateWithReusedSV).isNotEqualTo(stateWithSingleUseSV);
  }

  @Test
  public void test_hashCode() throws Exception {
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL).hashCode())
      .isEqualTo(state.newSymbolicValue(symbol1, Constraint.NULL).hashCode());
  }

}
