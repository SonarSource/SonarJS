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

public class NullabilityTest {

  @Test
  public void test_isNullOrUndefined() throws Exception {
    assertThat(Nullability.NULL.isNullOrUndefined()).isTrue();
    assertThat(Nullability.UNDEFINED.isNullOrUndefined()).isTrue();
    assertThat(Nullability.NULLY.isNullOrUndefined()).isTrue();
    assertThat(Nullability.UNKNOWN.isNullOrUndefined()).isFalse();
    assertThat(Nullability.NOT_NULLY.isNullOrUndefined()).isFalse();
    assertThat(Nullability.NOT_NULL.isNullOrUndefined()).isFalse();
    assertThat(Nullability.NOT_UNDEFINED.isNullOrUndefined()).isFalse();
  }

  @Test
  public void test_isNeitherNullNorUndefined() throws Exception {
    assertThat(Nullability.NULL.isNeitherNullNorUndefined()).isFalse();
    assertThat(Nullability.UNDEFINED.isNeitherNullNorUndefined()).isFalse();
    assertThat(Nullability.NULLY.isNeitherNullNorUndefined()).isFalse();
    assertThat(Nullability.UNKNOWN.isNeitherNullNorUndefined()).isFalse();
    assertThat(Nullability.NOT_NULLY.isNeitherNullNorUndefined()).isTrue();
    assertThat(Nullability.NOT_NULL.isNeitherNullNorUndefined()).isFalse();
    assertThat(Nullability.NOT_UNDEFINED.isNeitherNullNorUndefined()).isFalse();
  }


}
