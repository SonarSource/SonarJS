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
package org.sonar.javascript.se.points;

import org.junit.Test;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.SymbolicExecution;
import org.sonar.javascript.se.sv.SimpleSymbolicValue;
import org.sonar.javascript.se.sv.UnknownSymbolicValue;
import org.sonar.javascript.tree.impl.expression.IdentifierTreeImpl;
import org.sonar.javascript.utils.JavaScriptTreeModelTest;
import org.sonar.plugins.javascript.api.symbols.Symbol;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;
import org.sonar.plugins.javascript.api.tree.expression.IdentifierTree;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class IdentifierProgramPointTest extends JavaScriptTreeModelTest {

  @Test
  public void not_originated_from_undefined() throws Exception {
    IdentifierTree undefined = identifier("undefined");
    assertThat(IdentifierProgramPoint.originatesFrom(undefined)).isFalse();
  }

  @Test
  public void test_not_tracked_variable() throws Exception {
    IdentifierTree identifier = identifier("foo");
    assertThat(IdentifierProgramPoint.originatesFrom(identifier)).isTrue();

    SymbolicExecution execution = ProgramPointTest.execution();
    when(execution.trackedVariable(identifier)).thenReturn(null);
    IdentifierProgramPoint identifierProgramPoint = new IdentifierProgramPoint(identifier, execution);
    ProgramState state = identifierProgramPoint.execute(ProgramState.emptyState()).get();
    assertThat(state.peekStack()).isEqualTo(UnknownSymbolicValue.UNKNOWN);
  }

  @Test
  public void test_tracked_variable() throws Exception {
    IdentifierTree identifier = identifier("foo");
    assertThat(IdentifierProgramPoint.originatesFrom(identifier)).isTrue();

    SymbolicExecution execution = ProgramPointTest.execution();
    Symbol symbol = mock(Symbol.class);
    when(execution.trackedVariable(identifier)).thenReturn(symbol);
    ProgramState state = ProgramState.emptyState();
    SimpleSymbolicValue value = new SimpleSymbolicValue(42);
    state = state.assignment(symbol, value);

    IdentifierProgramPoint identifierProgramPoint = new IdentifierProgramPoint(identifier, execution);
    state = identifierProgramPoint.execute(state).get();
    assertThat(state.peekStack()).isEqualTo(value);
  }

  public static IdentifierTree identifier(String name) {
    IdentifierTreeImpl tree = mock(IdentifierTreeImpl.class);
    when(tree.getKind()).thenReturn(Kind.IDENTIFIER_REFERENCE);
    when(tree.name()).thenReturn(name);

    return tree;
  }

}
