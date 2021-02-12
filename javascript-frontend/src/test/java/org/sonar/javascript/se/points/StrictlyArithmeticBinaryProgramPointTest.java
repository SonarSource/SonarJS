/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import org.sonar.javascript.se.sv.SymbolicValue;
import org.sonar.javascript.se.sv.SymbolicValueWithConstraint;
import org.sonar.plugins.javascript.api.tree.Tree.Kind;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.se.points.ProgramPointTest.tree;

public class StrictlyArithmeticBinaryProgramPointTest {

  private ProgramState state;
  private StrictlyArithmeticBinaryProgramPoint point;

  @Before
  public void setUp() throws Exception {
    this.state = ProgramState.emptyState();
    this.point = new StrictlyArithmeticBinaryProgramPoint();
  }

  @Test
  public void returnsNumberPrimitiveFromTwoNumbers() throws Exception {
    // (2 - 1) or (2 * 1) or (2 / 1) or (2 % 3) or (2 & 3) or (1 | 2) or (2 ^ 2) or (1 << 2) or (1 >> 2) or (1 >>> 3)
    state = this.state.pushToStack(anyNumber()).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
  }

  @Test
  public void returnsNaNFromOneUndefined() throws Exception {
    // (undefined - 2)
    state = this.state.pushToStack(undefined()).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void matchingTrees() throws Exception {
    assertThat(StrictlyArithmeticBinaryProgramPoint.originatesFrom(tree(Kind.PLUS))).isFalse();
    assertThat(StrictlyArithmeticBinaryProgramPoint.originatesFrom(tree(Kind.RETURN_STATEMENT))).isFalse();
    assertThat(StrictlyArithmeticBinaryProgramPoint.originatesFrom(tree(Kind.BITWISE_AND))).isFalse();
    assertThat(StrictlyArithmeticBinaryProgramPoint.originatesFrom(tree(Kind.LEFT_SHIFT))).isFalse();

    assertThat(StrictlyArithmeticBinaryProgramPoint.originatesFrom(tree(Kind.DIVIDE))).isTrue();
    assertThat(StrictlyArithmeticBinaryProgramPoint.originatesFrom(tree(Kind.MULTIPLY_ASSIGNMENT))).isTrue();
  }

  private SymbolicValue undefined() {
    return new SymbolicValueWithConstraint(Constraint.UNDEFINED);
  }

  private SymbolicValue anyNumber() {
    return new SymbolicValueWithConstraint(Constraint.ANY_NUMBER);
  }
}
