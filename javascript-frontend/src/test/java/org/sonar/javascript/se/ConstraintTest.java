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

import static org.fest.assertions.Assertions.assertThat;
import static org.sonar.javascript.se.Constraint.ANY_VALUE;
import static org.sonar.javascript.se.Constraint.FALSY;
import static org.sonar.javascript.se.Constraint.NO_POSSIBLE_VALUE;
import static org.sonar.javascript.se.Constraint.NULL;
import static org.sonar.javascript.se.Constraint.NULL_OR_UNDEFINED;
import static org.sonar.javascript.se.Constraint.TRUTHY;
import static org.sonar.javascript.se.Constraint.UNDEFINED;

public class ConstraintTest {

  @Test
  public void any_value() throws Exception {
    assertThat(ANY_VALUE.not()).isEqualTo(NO_POSSIBLE_VALUE);
    assertThat(ANY_VALUE.and(NULL)).isEqualTo(NULL);
    assertThat(ANY_VALUE.and(FALSY)).isEqualTo(FALSY);
    assertThat(ANY_VALUE.and(NO_POSSIBLE_VALUE)).isEqualTo(NO_POSSIBLE_VALUE);
  }

  @Test
  public void no_possible_value() throws Exception {
    assertThat(NO_POSSIBLE_VALUE.not()).isEqualTo(ANY_VALUE);
    assertThat(NO_POSSIBLE_VALUE.and(NULL)).isEqualTo(NO_POSSIBLE_VALUE);
    assertThat(NO_POSSIBLE_VALUE.and(FALSY)).isEqualTo(NO_POSSIBLE_VALUE);
    assertThat(NO_POSSIBLE_VALUE.and(ANY_VALUE)).isEqualTo(NO_POSSIBLE_VALUE);
  }

  @Test
  public void truthiness() throws Exception {
    assertThat(ANY_VALUE.truthiness()).isEqualTo(Truthiness.UNKNOWN);
    assertThat(NULL.truthiness()).isEqualTo(Truthiness.FALSY);
    assertThat(UNDEFINED.truthiness()).isEqualTo(Truthiness.FALSY);
    assertThat(NULL_OR_UNDEFINED.truthiness()).isEqualTo(Truthiness.FALSY);
    assertThat(FALSY.truthiness()).isEqualTo(Truthiness.FALSY);
    assertThat(TRUTHY.truthiness()).isEqualTo(Truthiness.TRUTHY);
  }

  @Test
  public void nullability() throws Exception {
    assertThat(ANY_VALUE.nullability()).isEqualTo(Nullability.UNKNOWN);
    assertThat(NULL.nullability()).isEqualTo(Nullability.NULL);
    assertThat(UNDEFINED.nullability()).isEqualTo(Nullability.NULL);
    assertThat(NULL_OR_UNDEFINED.nullability()).isEqualTo(Nullability.NULL);
    assertThat(FALSY.nullability()).isEqualTo(Nullability.UNKNOWN);
    assertThat(TRUTHY.nullability()).isEqualTo(Nullability.NOT_NULL);
  }

}
