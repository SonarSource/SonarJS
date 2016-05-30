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

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.sonar.javascript.se.Constraint.TRUTHY;

public class SymbolicValueTest {

  private static final ProgramState EMPTY_STATE = ProgramState.emptyState();
  private Symbol symbol = mock(Symbol.class);

  @Test
  public void constrain() throws Exception {
    ProgramState state1 = EMPTY_STATE.newSymbolicValue(symbol, null);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    assertThat(sv1.constrain(state1, TRUTHY)).containsExactly(state1.constrain(sv1, TRUTHY));
  }
  
  @Test
  public void constrain_with_unreachable_constraint() throws Exception {
    ProgramState state1 = EMPTY_STATE.newSymbolicValue(symbol, Constraint.FALSY);
    SymbolicValue sv1 = state1.getSymbolicValue(symbol);
    assertThat(sv1.constrain(state1, TRUTHY)).isEmpty();
  }

}
