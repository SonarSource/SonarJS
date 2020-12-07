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

import com.google.common.collect.ImmutableList;
import org.junit.Test;
import org.sonar.javascript.se.Constraint;
import org.sonar.javascript.se.ProgramState;

import static org.assertj.core.api.Assertions.assertThat;

public class FunctionSymbolicValueTest {

  @Test
  public void test() throws Exception {
    ProgramState ps = ProgramState.emptyState();
    FunctionSymbolicValue basicFunctionSV = new FunctionSymbolicValue() {};

    assertThat(basicFunctionSV.baseConstraint(ps)).isEqualTo(Constraint.FUNCTION);
    assertThat(basicFunctionSV.call(ImmutableList.of()).baseConstraint(ps)).isEqualTo(Constraint.ANY_VALUE);
    assertThat(basicFunctionSV.instantiate().baseConstraint(ps)).isEqualTo(Constraint.OBJECT);
    assertThat(basicFunctionSV.getPropertyValue("fooBar")).isEqualTo(UnknownSymbolicValue.UNKNOWN);
  }
}
