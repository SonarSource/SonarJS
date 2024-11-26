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
package org.sonar.plugins.javascript.utils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.plugins.javascript.utils.UnicodeEscape.unicodeEscape;

import org.junit.jupiter.api.Test;

class UnicodeEscapeTest {

  @Test
  void test_unicodeEscape() {
    assertThat(unicodeEscape("test \u0000")).isEqualTo("test \\u0000");
    assertThat(unicodeEscape("Ödmjuk")).isEqualTo("\\u0214dmjuk");
  }
}
