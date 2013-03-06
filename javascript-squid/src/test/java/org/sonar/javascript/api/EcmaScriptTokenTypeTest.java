/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.javascript.api;

import org.junit.Test;

import static org.fest.assertions.Assertions.assertThat;

public class EcmaScriptTokenTypeTest {

  @Test
  public void test() {
    assertThat(EcmaScriptTokenType.values().length).isEqualTo(4);

    for (EcmaScriptTokenType type : EcmaScriptTokenType.values()) {
      assertThat(type.getName()).isEqualTo(type.name());
      assertThat(type.getValue()).isEqualTo(type.name());
      assertThat(type.hasToBeSkippedFromAst(null)).isFalse();
    }
  }

}
