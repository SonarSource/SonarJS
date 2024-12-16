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
package org.sonar.plugins.javascript.analysis;

import java.util.HashMap;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.Dependency;

public class PluginTelemetry {

  private static final Logger LOG = LoggerFactory.getLogger(PluginTelemetry.class);
  private static final String KEY_PREFIX = "javascript.";
  private static final String DEPENDENCY_PREFIX = KEY_PREFIX + "dependency.";
  private static final String RUNTIME_PREFIX = KEY_PREFIX + "runtime.";

  private final BridgeServer server;
  private final SensorContext ctx;

  public PluginTelemetry(SensorContext ctx, BridgeServer server) {
    this.ctx = ctx;
    this.server = server;
  }

  void reportTelemetry() {
    var isTelemetrySupported = ctx
      .runtime()
      .getApiVersion()
      .isGreaterThanOrEqual(Version.create(10, 9));
    if (!isTelemetrySupported) {
      // addTelemetryProperty is added in 10.9:
      // https://github.com/SonarSource/sonar-plugin-api/releases/tag/10.9.0.2362
      return;
    }
    var dependenciesResponse = server.getTelemetry();
    var keyMapToSave = new HashMap<String, String>();
    if (dependenciesResponse != null) {
      keyMapToSave.putAll(
        dependenciesResponse
          .dependencies()
          .stream()
          .collect(
            Collectors.toMap(
              dependency -> DEPENDENCY_PREFIX + dependency.name(),
              Dependency::version
            )
          )
      );
    }
    keyMapToSave.put(
      RUNTIME_PREFIX + "major-version",
      Integer.toString(server.command().getActualNodeVersion().major())
    );
    keyMapToSave.put(
      RUNTIME_PREFIX + "version",
      server.command().getActualNodeVersion().toString()
    );
    keyMapToSave.put(
      RUNTIME_PREFIX + "node-executable-origin",
      server.command().getNodeExecutableOrigin()
    );
    keyMapToSave.forEach(ctx::addTelemetryProperty);
    LOG.debug("Telemetry saved: {}", keyMapToSave);
  }
}
