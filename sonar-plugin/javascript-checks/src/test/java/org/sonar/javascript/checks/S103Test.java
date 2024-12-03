/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.javascript.checks;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class S103Test {

  private Map<String, Object> expectedConfigurationsMap = new HashMap<>();

  @Test
  void default_configuration() {
    S103 check = new S103();
    expectedConfigurationsMap.put("tabWidth", 1);
    expectedConfigurationsMap.put("code", 180);
    assertThat(check.configurations()).containsExactly(expectedConfigurationsMap);
  }

  @Test
  void custom_configuration() {
    S103 check = new S103();
    check.maximumLineLength = 120;
    expectedConfigurationsMap.put("tabWidth", 1);
    expectedConfigurationsMap.put("code", 120);
    assertThat(check.configurations()).containsExactly(expectedConfigurationsMap);
  }
}
