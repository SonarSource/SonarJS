/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import static org.sonarsource.api.sonarlint.SonarLintSide.INSTANCE;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.stream.Stream;
import org.sonar.api.config.Configuration;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * Class to access host parameters.
 * This abstraction is necessary to mock it in tests.
 */
@ScannerSide
@SonarLintSide(lifespan = INSTANCE)
public class Environment {

  private final Configuration configuration;

  public Environment(Configuration configuration) {
    this.configuration = configuration;
  }

  public Path getSonarUserHome() {
    return Stream
      .of(
        configuration.get("sonar.userHome").orElse(null),
        System.getenv("SONAR_USER_HOME"),
        System.getProperty("user.home") + File.separator + ".sonar"
      )
      .filter(Objects::nonNull)
      .findFirst()
      .map(Path::of)
      .get();
  }

  public String getOsName() {
    return System.getProperty("os.name");
  }

  public String getOsArch() {
    return System.getProperty("os.arch");
  }

  public boolean isAlpine() {
    return Files.exists(Path.of("/etc/alpine-release"));
  }
}
