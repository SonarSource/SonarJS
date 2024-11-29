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

class S5693Test {

  @Test
  void configurations() {
    S5693 check = new S5693();
    // default configuration
    String defaultConfigAsString = new Gson().toJson(check.configurations());
    assertThat(defaultConfigAsString).isEqualTo("[{\"fileUploadSizeLimit\":8000000,\"standardSizeLimit\":2000000}]");
    check.fileUploadSizeLimit = 42;
    check.standardSizeLimit = 24;
    String customConfigAsString = new Gson().toJson(check.configurations());
    assertThat(customConfigAsString).isEqualTo("[{\"fileUploadSizeLimit\":42,\"standardSizeLimit\":24}]");
  }
}
