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
package org.sonar.javascript.se.sv;

import org.junit.Test;
import org.sonar.javascript.se.ProgramState;
import org.sonar.plugins.javascript.api.symbols.Symbol;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.sonar.javascript.se.Constraint.FALSY;
import static org.sonar.javascript.se.Constraint.NULL;
import static org.sonar.javascript.se.Constraint.NULL_OR_UNDEFINED;
import static org.sonar.javascript.se.Constraint.TRUTHY;

public class EqualToSymbolicValueTest {

  private Symbol symbol = mock(Symbol.class);

  @Test(expected = IllegalArgumentException.class)
  public void should_throw_on_null_operand() throws Exception {
    new EqualToSymbolicValue(null, NULL_OR_UNDEFINED);
  }

  @Test
  public void constrain() throws Exception {
    ProgramState state1 = ProgramState.emptyState().newSymbolicValue(symbol, null);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    SymbolicValue equalTo = new EqualToSymbolicValue(sv1, NULL);
    assertThat(equalTo.constrain(state1, TRUTHY)).containsExactly(state1.constrain(sv1, NULL));
    assertThat(equalTo.constrain(state1, FALSY)).containsExactly(state1.constrain(sv1, NULL.not()));
    assertThat(equalTo.constrain(state1, NULL)).isEmpty();
  }

  @Test
  public void to_string() throws Exception {
    ProgramState state1 = ProgramState.emptyState().newSymbolicValue(symbol, null);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    SymbolicValue equalTo = new EqualToSymbolicValue(sv1, NULL);
    assertThat(equalTo.toString()).isEqualTo("SV_0 === NULL");
  }

}
