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

class StringLiteralsQuotesCheckTest {

  @Test
  void configurations() {
    StringLiteralsQuotesCheck check = new StringLiteralsQuotesCheck();

    // default configuration
    String defaultConfigAsString = new Gson().toJson(check.configurations());
    assertThat(defaultConfigAsString)
      .isEqualTo("[\"single\",{\"avoidEscape\":true,\"allowTemplateLiterals\":true}]");

    // custom configuration
    check.singleQuotes = false;
    String customConfigAsString = new Gson().toJson(check.configurations());
    assertThat(customConfigAsString)
      .isEqualTo("[\"double\",{\"avoidEscape\":true,\"allowTemplateLiterals\":true}]");
  }
}
