/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
package org.sonar.javascript.checks;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LineLengthCheckTest {

  private Map<String, Object> expectedConfigurationsMap = new HashMap<>();

  @Test
  void default_configuration() {
    LineLengthCheck check = new LineLengthCheck();
    expectedConfigurationsMap.put("tabWidth", 1);
    expectedConfigurationsMap.put("code", 180);
    assertThat(check.configurations()).containsExactly(expectedConfigurationsMap);
  }

  @Test
  void custom_configuration() {
    LineLengthCheck check = new LineLengthCheck();
    check.maximumLineLength = 120;
    expectedConfigurationsMap.put("tabWidth", 1);
    expectedConfigurationsMap.put("code", 120);
    assertThat(check.configurations()).containsExactly(expectedConfigurationsMap);
  }

}
