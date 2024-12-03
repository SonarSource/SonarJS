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

class S124Test {

  @Test
  void test_configuration() {
    S124 check = new S124();

    String defaultConfigAsString = new Gson().toJson(check.configurations());
    assertThat(defaultConfigAsString)
      .isEqualTo(
        "[{\"regularExpression\":\"\",\"message\":\"The regular expression matches this comment.\",\"flags\":\"\"}]"
      );

    check.message = "This is a message";

    String configAsString = new Gson().toJson(check.configurations());
    assertThat(configAsString)
      .isEqualTo("[{\"regularExpression\":\"\",\"message\":\"This is a message\",\"flags\":\"\"}]");

    check.regularExpression = "[a-z]";

    String configAsString2 = new Gson().toJson(check.configurations());
    assertThat(configAsString2)
      .isEqualTo(
        "[{\"regularExpression\":\"[a-z]\",\"message\":\"This is a message\",\"flags\":\"\"}]"
      );

    check.flags = "iu";
    assertThat(new Gson().toJson(check.configurations()))
      .isEqualTo(
        "[{\"regularExpression\":\"[a-z]\",\"message\":\"This is a message\",\"flags\":\"iu\"}]"
      );
  }
}
