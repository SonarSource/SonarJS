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
import static org.mockito.Mockito.mock;

public class ProgramStateTest {

  private final Symbol symbol1 = new Symbol("symbol1", Kind.VARIABLE, null);
  private final Symbol symbol2 = new Symbol("symbol2", Kind.VARIABLE, null);
  private ProgramState state = ProgramState.emptyState();

  @Test
  public void addValue() throws Exception {
    SymbolicValue value1 = mock(SymbolicValue.class);
    SymbolicValue value2 = mock(SymbolicValue.class);
    SymbolicValue value3 = mock(SymbolicValue.class);
    ProgramState state1 = state.copyAndAddValue(symbol1, value1);
    ProgramState state2 = state1
      .copyAndAddValue(symbol1, value2)
      .copyAndAddValue(symbol2, value3);

    assertThat(state.get(symbol1)).isNull();
    assertThat(state1.get(symbol1)).isEqualTo(value1);
    assertThat(state2.get(symbol1)).isEqualTo(value2);
    assertThat(state2.get(symbol2)).isEqualTo(value3);
  }

  @Test
  public void constrain() throws Exception {
    state = state.copyAndAddValue(symbol1, SymbolicValue.UNKNOWN);
    assertThat(state.constrain(symbol1, Truthiness.FALSY).get(symbol1).truthiness()).isEqualTo(Truthiness.FALSY);
    assertThat(state.constrain(symbol2, Truthiness.FALSY).get(symbol2)).isNull();

    state = state.copyAndAddValue(symbol1, SymbolicValue.NULL_OR_UNDEFINED);
    assertThat(state.constrain(symbol1, Truthiness.TRUTHY).get(symbol1).nullability()).isEqualTo(Nullability.NOT_NULL);

    state = state.copyAndAddValue(symbol2, SymbolicValue.UNKNOWN);
    state = state.constrain(symbol2, Truthiness.TRUTHY);
    assertThat(state.constrain(symbol2, Nullability.NULL).get(symbol2).truthiness()).isEqualTo(Truthiness.FALSY);


  }

  @Test
  public void test_equals() throws Exception {
    SymbolicValue value1 = mock(SymbolicValue.class);
    SymbolicValue value2 = mock(SymbolicValue.class);
    assertThat(state.copyAndAddValue(symbol1, value1)).isEqualTo(state.copyAndAddValue(symbol1, value1));
    assertThat(state.copyAndAddValue(symbol1, value1)).isNotEqualTo(state.copyAndAddValue(symbol1, value2));
    assertThat(state.copyAndAddValue(symbol1, value1)).isNotEqualTo(null);
    assertThat(state.copyAndAddValue(symbol1, value1)).isNotEqualTo("");
  }

  @Test
  public void test_hashCode() throws Exception {
    SymbolicValue value1 = mock(SymbolicValue.class);
    assertThat(state.copyAndAddValue(symbol1, value1).hashCode())
      .isEqualTo(state.copyAndAddValue(symbol1, value1).hashCode());
  }

}
