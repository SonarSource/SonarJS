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

import static org.assertj.core.api.Assertions.assertThat;

import com.google.gson.Gson;
import org.junit.jupiter.api.Test;

class NoDuplicateStringCheckTest {

  @Test
  void configurations() {
    // default configuration
    String configAsString = new Gson().toJson(new NoDuplicateStringCheck().configurations());
    assertThat(configAsString)
      .isEqualTo("[{\"threshold\":3,\"ignoreStrings\":\"application/json\"}]");
    // custom configuration
    NoDuplicateStringCheck noDuplicateStringCheck = new NoDuplicateStringCheck();
    noDuplicateStringCheck.threshold = 10;
    noDuplicateStringCheck.ignoreStrings = "foo,bar,baz";
    configAsString = new Gson().toJson(noDuplicateStringCheck.configurations());
    assertThat(configAsString).isEqualTo("[{\"threshold\":10,\"ignoreStrings\":\"foo,bar,baz\"}]");
  }
}
