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
package org.sonar.javascript.se.sv;

import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;
import org.sonar.javascript.se.sv.IncDecSymbolicValue.Sign;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.javascript.se.sv.IncDecSymbolicValue.Sign.MINUS;
import static org.sonar.javascript.se.sv.IncDecSymbolicValue.Sign.PLUS;

public class IncDecSymbolicValueTest {

  private static Constraint resultingConstraint(Sign sign, Constraint operandConstraint) {
    SymbolicValueWithConstraint operandValue = new SymbolicValueWithConstraint(operandConstraint);
    return new IncDecSymbolicValue(sign, operandValue).baseConstraint(ProgramState.emptyState());
  }

  @Test
  public void plus_one() throws Exception {
    assertThat(resultingConstraint(PLUS, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(PLUS, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(PLUS, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(resultingConstraint(PLUS, Constraint.ZERO)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(PLUS, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(PLUS, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }

  @Test
  public void minus_one() throws Exception {
    assertThat(resultingConstraint(MINUS, Constraint.ANY_VALUE)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(MINUS, Constraint.POSITIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.POSITIVE_NUMBER_PRIMITIVE.or(Constraint.ZERO));
    assertThat(resultingConstraint(MINUS, Constraint.NEGATIVE_NUMBER_PRIMITIVE)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(MINUS, Constraint.ZERO)).isEqualTo(Constraint.NEGATIVE_NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(MINUS, Constraint.NUMBER_OBJECT)).isEqualTo(Constraint.NUMBER_PRIMITIVE);
    assertThat(resultingConstraint(MINUS, Constraint.NAN)).isEqualTo(Constraint.NAN);
  }
}
