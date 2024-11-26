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

import com.google.gson.Gson;
import org.junit.jupiter.api.Test;

class TooManyLinesInFunctionCheckTest {

  @Test
  void test_configuration() {
    var check = new TooManyLinesInFunctionCheck();

    String defaultConfigAsString = new Gson().toJson(check.configurations());
    assertThat(defaultConfigAsString).isEqualTo("[{\"maximum\":200}]");

    check.max = 42;
    String configAsString = new Gson().toJson(check.configurations());
    assertThat(configAsString).isEqualTo("[{\"maximum\":42}]");
  }
}
