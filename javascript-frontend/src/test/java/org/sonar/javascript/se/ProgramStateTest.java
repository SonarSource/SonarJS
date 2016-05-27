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
package org.sonar.javascript.se;

import org.junit.Test;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.symbols.Symbol.Kind;

import static org.fest.assertions.Assertions.assertThat;

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
    assertThat(state.constrain(sv1, Constraint.FALSY).getConstraint(symbol1).truthiness()).isEqualTo(Truthiness.FALSY);
    assertThat(sv2).isNull();
    assertThat(state.constrain(sv2, Constraint.FALSY).getConstraint(symbol2)).isEqualTo(Constraint.ANY_VALUE);

    state = state.newSymbolicValue(symbol1, Constraint.NULL_OR_UNDEFINED);
    assertThat(state.constrain(state.getSymbolicValue(symbol1), Constraint.TRUTHY)).isNull();

    state = state.newSymbolicValue(symbol2, null);
    state = state.constrain(state.getSymbolicValue(symbol2), Constraint.TRUTHY);
    assertThat(state.constrain(state.getSymbolicValue(symbol2), Constraint.NULL)).isNull();
  }

  @Test
  public void test_equals() throws Exception {
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isEqualTo(state.newSymbolicValue(symbol1, Constraint.NULL));
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isNotEqualTo(state.newSymbolicValue(symbol1, Constraint.UNDEFINED.not()));
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isNotEqualTo(null);
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL)).isNotEqualTo("");
  }

  @Test
  public void test_hashCode() throws Exception {
    assertThat(state.newSymbolicValue(symbol1, Constraint.NULL).hashCode())
      .isEqualTo(state.newSymbolicValue(symbol1, Constraint.NULL).hashCode());
  }

}
