/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import org.sonar.api.SonarProduct;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.config.Configuration;

/**
 * {@link BridgeServerImpl} requires information from {@link org.sonar.api.batch.sensor.SensorContext}.
 * However, {@link org.sonar.api.batch.sensor.SensorContext} is a big object, containing more than what we need.
 * This class will contain only information required by {@link BridgeServerImpl}.
 * This will reduce the dependency on external API, and ease the testing.
 */
public record BridgeServerConfig(
  Configuration config,
  String workDirAbsolutePath,
  SonarProduct product
) {
  public static BridgeServerConfig fromSensorContext(SensorContext context) {
    return new BridgeServerConfig(
      context.config(),
      context.fileSystem().workDir().getAbsolutePath(),
      context.runtime().getProduct()
    );
  }
}
