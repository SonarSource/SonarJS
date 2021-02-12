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
import org.sonar.plugins.javascript.api.tree.Tree;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.se.points.ProgramPointTest.tree;

public class BitwiseBinaryProgramPointTest {

  private ProgramState state;
  private BitwiseBinaryProgramPoint point;

  @Before
  public void setUp() throws Exception {
    this.state = ProgramState.emptyState();
    this.point = new BitwiseBinaryProgramPoint();
  }

  @Test
  public void returnsNumberPrimitiveFromTwoNumbers() throws Exception {
    // (2 & 3) or (1 | 2) or (2 ^ 2) or (1 << 2) or (1 >> 2) or (1 >>> 3)
    state = this.state.pushToStack(anyNumber()).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
  }

  @Test
  public void returnsNumberPrimitiveFromUndefined() throws Exception {
    // (undefined & 2) or (2 | undefined)...
    state = this.state.pushToStack(undefined()).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
  }

  @Test
  public void returnsNumberPrimitiveFromNaN() throws Exception {
    // (NaN & 2) ...
    state = this.state.pushToStack(nan()).pushToStack(anyNumber());
    assertThat(point.resultingConstraint(state)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
  }

  @Test
  public void matchingTrees() throws Exception {
    assertThat(BitwiseBinaryProgramPoint.originatesFrom(tree(Tree.Kind.PLUS))).isFalse();
    assertThat(BitwiseBinaryProgramPoint.originatesFrom(tree(Tree.Kind.RETURN_STATEMENT))).isFalse();
    assertThat(BitwiseBinaryProgramPoint.originatesFrom(tree(Tree.Kind.DIVIDE))).isFalse();
    assertThat(BitwiseBinaryProgramPoint.originatesFrom(tree(Tree.Kind.MULTIPLY_ASSIGNMENT))).isFalse();

    assertThat(BitwiseBinaryProgramPoint.originatesFrom(tree(Tree.Kind.BITWISE_AND))).isTrue();
  }

  private SymbolicValue undefined() {
    return new SymbolicValueWithConstraint(Constraint.UNDEFINED);
  }

  private SymbolicValue anyNumber() {
    return new SymbolicValueWithConstraint(Constraint.ANY_NUMBER);
  }

  private SymbolicValue nan() {
    return new SymbolicValueWithConstraint(Constraint.NAN);
  }
}
