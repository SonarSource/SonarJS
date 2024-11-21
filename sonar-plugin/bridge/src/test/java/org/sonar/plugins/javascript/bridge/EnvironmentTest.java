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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.sonar.api.config.internal.MapSettings;

class EnvironmentTest {

  @Test
  void sonar_user_home() {
    var conf = new MapSettings();
    conf.setProperty("sonar.userHome", "/home/user/.sonar");
    Path sonarUserHome = new Environment(conf.asConfig()).getSonarUserHome();
    assertThat(sonarUserHome).isEqualTo(Path.of("/home/user/.sonar"));
  }
}
