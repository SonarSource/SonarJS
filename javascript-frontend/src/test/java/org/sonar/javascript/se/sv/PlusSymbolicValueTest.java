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

import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.symbols.Symbol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

public class PlusSymbolicValueTest {

  @Test
  public void constraint() throws Exception {
    assertThat(plusConstraint(Constraint.TRUTHY_STRING_PRIMITIVE, Constraint.EMPTY_STRING_PRIMITIVE)).isEqualTo(Constraint.STRING_PRIMITIVE);
    assertThat(plusConstraint(Constraint.TRUTHY_STRING_PRIMITIVE, Constraint.NUMBER_PRIMITIVE)).isEqualTo(Constraint.STRING_PRIMITIVE);
    assertThat(plusConstraint(Constraint.TRUTHY_NUMBER_PRIMITIVE, Constraint.NAN)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(plusConstraint(Constraint.TRUTHY_NUMBER_PRIMITIVE, Constraint.BOOLEAN_PRIMITIVE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(plusConstraint(Constraint.TRUTHY_NUMBER_PRIMITIVE, Constraint.TRUTHY)).isEqualTo(Constraint.NUMBER_PRIMITIVE.or(Constraint.STRING_PRIMITIVE));
    assertThat(plusConstraint(Constraint.ANY_NUMBER, Constraint.UNDEFINED)).isEqualTo(Constraint.NAN);
    assertThat(plusConstraint(Constraint.UNDEFINED, Constraint.ANY_NUMBER)).isEqualTo(Constraint.NAN);
    assertThat(plusConstraint(Constraint.UNDEFINED, Constraint.UNDEFINED)).isEqualTo(Constraint.NAN);
    assertThat(plusConstraint(Constraint.UNDEFINED, Constraint.ANY_BOOLEAN)).isEqualTo(Constraint.NAN);
    assertThat(plusConstraint(Constraint.UNDEFINED, Constraint.STRING_PRIMITIVE)).isEqualTo(Constraint.STRING_PRIMITIVE);
  }

  private Constraint plusConstraint(Constraint constraint1, Constraint constraint2) {
    Symbol symbol1 = mock(Symbol.class);
    Symbol symbol2 = mock(Symbol.class);
    ProgramState state = ProgramState.emptyState()
      .newSymbolicValue(symbol1, constraint1)
      .newSymbolicValue(symbol2, constraint2);
    SymbolicValue sv1 = state.getSymbolicValue(symbol1);
    SymbolicValue sv2 = state.getSymbolicValue(symbol2);
    PlusSymbolicValue plus = new PlusSymbolicValue(sv1, sv2);
    return plus.baseConstraint(state);
  }

}
