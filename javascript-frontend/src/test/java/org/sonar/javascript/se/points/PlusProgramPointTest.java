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

import org.junit.Before;
import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.SimpleSymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.se.points.ProgramPointTest.tree;

public class PlusProgramPointTest {

  private static final SimpleSymbolicValue UNKNOWN_VALUE = new SimpleSymbolicValue(1);
  private static final Constraint NUMBER_OR_STRING = Constraint.NUMBER_PRIMITIVE.or(Constraint.STRING_PRIMITIVE);
  private ProgramState state;
  private PlusProgramPoint point;

  @Before
  public void setUp() throws Exception {
    this.state = ProgramState.emptyState();
    this.point = new PlusProgramPoint();
  }

  @Test
  public void unknownPlusUnknown() throws Exception {
    // x += a or a + b
    this.state = state.pushToStack(UNKNOWN_VALUE).pushToStack(UNKNOWN_VALUE);
    assertThat(point.resultingConstraint(state)).isEqualTo(NUMBER_OR_STRING);
  }

  @Test
  public void unknownPlusString() throws Exception {
    // x += 'str' or a + 'str'
    this.state = state.pushToStack(UNKNOWN_VALUE).pushToStack(anyString());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.STRING_PRIMITIVE);
  }

  @Test
  public void unknownPlusNumber() throws Exception {
    // x += 1 or a + 1
    this.state = state.pushToStack(UNKNOWN_VALUE).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(NUMBER_OR_STRING);
  }

  @Test
  public void stringPlusNumber() throws Exception {
    // 'str' + 1
    this.state = state.pushToStack(anyString()).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.STRING_PRIMITIVE);
  }

  @Test
  public void stringPlusBoolean() throws Exception {
    // 'str' + true
    this.state = state.pushToStack(anyString()).pushToStack(anyBoolean());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.STRING_PRIMITIVE);
  }

  @Test
  public void unknownPlusBoolean() throws Exception {
    // a + true
    this.state = state.pushToStack(UNKNOWN_VALUE).pushToStack(anyBoolean());
    assertThat(point.resultingConstraint(state)).isEqualTo(NUMBER_OR_STRING);
  }

  @Test
  public void undefinedPlusNumber() throws Exception {
    // var a; a + 3;
    this.state = state.pushToStack(undefined()).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void matchingTrees() throws Exception {
    assertThat(PlusProgramPoint.originatesFrom(tree(Kind.PLUS))).isTrue();
    assertThat(PlusProgramPoint.originatesFrom(tree(Kind.PLUS_ASSIGNMENT))).isTrue();

    assertThat(PlusProgramPoint.originatesFrom(tree(Kind.RETURN_STATEMENT))).isFalse();
    assertThat(PlusProgramPoint.originatesFrom(tree(Kind.DIVIDE))).isFalse();
    assertThat(PlusProgramPoint.originatesFrom(tree(Kind.BITWISE_OR))).isFalse();
  }

  private SymbolicValue anyBoolean() {
    return new SymbolicValueWithConstraint(Constraint.ANY_BOOLEAN);
  }

  private SymbolicValue anyString() {
    return new SymbolicValueWithConstraint(Constraint.ANY_STRING);
  }

  private SymbolicValue anyNumber() {
    return new SymbolicValueWithConstraint(Constraint.ANY_NUMBER);
  }

  private SymbolicValue undefined() {
    return new SymbolicValueWithConstraint(Constraint.UNDEFINED);
  }
}
