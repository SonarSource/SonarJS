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
import static org.sonar.javascript.se.Nullability.State.NO;
import static org.sonar.javascript.se.Nullability.State.UNKNOWN;
import static org.sonar.javascript.se.Nullability.State.YES;

public class NullabilityTest {

  @Test
  public void test_toString() throws Exception {
    assertThat(Nullability.NULL.toString()).isEqualTo("NULL");
    assertThat(Nullability.UNDEFINED.toString()).isEqualTo("UNDEFINED");
    assertThat(Nullability.NULLY.toString()).isEqualTo("NULLY");
    assertThat(Nullability.UNKNOWN.toString()).isEqualTo("UNKNOWN");
    assertThat(Nullability.NOT_NULLY.toString()).isEqualTo("NOT_NULLY");
  }

  @Test
  public void test_isNullOrUndefined() throws Exception {
    assertThat(Nullability.NULL.isNullOrUndefined()).isEqualTo(YES);
    assertThat(Nullability.UNDEFINED.isNullOrUndefined()).isEqualTo(YES);
    assertThat(Nullability.NULLY.isNullOrUndefined()).isEqualTo(YES);
    assertThat(Nullability.UNKNOWN.isNullOrUndefined()).isEqualTo(UNKNOWN);
    assertThat(Nullability.NOT_NULLY.isNullOrUndefined()).isEqualTo(NO);
  }

  @Test
  public void test_hashCode() throws Exception {
    assertThat(Nullability.NOT_NULLY.hashCode()).isEqualTo(Nullability.NOT_NULLY.hashCode());
  }

  @Test
  public void test_equals() throws Exception {
    assertThat(Nullability.NULL).isNotEqualTo(null);
    assertThat(Nullability.NULL).isNotEqualTo("");
    assertThat(Nullability.NULL).isEqualTo(Nullability.NULL);
    assertThat(Nullability.NULL).isNotEqualTo(Nullability.NULLY);
  }
}
