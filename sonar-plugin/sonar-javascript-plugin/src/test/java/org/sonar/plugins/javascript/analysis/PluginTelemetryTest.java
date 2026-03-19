/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.ProgramCreationTelemetry;
import org.sonar.plugins.javascript.bridge.BridgeServer.ProjectAnalysisTelemetry;
import org.sonar.plugins.javascript.bridge.BridgeServer.RuntimeTelemetry;
import org.sonar.plugins.javascript.bridge.BridgeServer.TelemetryData;

class PluginTelemetryTest {

  private SensorContext ctx;
  private PluginTelemetry pluginTelemetry;
  private JsTsContext<SensorContext> jsTsContext;
  private BridgeServer server;

  @BeforeEach
  void setUp() {
    jsTsContext = mock(JsTsContext.class);
    ctx = mock(SensorContext.class);
    SonarRuntime sonarRuntime = mock(SonarRuntime.class);
    when(ctx.runtime()).thenReturn(sonarRuntime);
    when(jsTsContext.getSensorContext()).thenReturn(ctx);

    server = mock(BridgeServer.class);
    when(server.getTelemetry()).thenReturn(
      new TelemetryData(new RuntimeTelemetry(Version.create(22, 9), "embedded"))
    );
    pluginTelemetry = new PluginTelemetry(jsTsContext, server, null);
  }

  @Test
  void shouldNotReportIfApiVersionIsLessThan109() {
    when(ctx.runtime().getApiVersion()).thenReturn(Version.create(10, 8));
    pluginTelemetry.reportTelemetry();
    verify(ctx, never()).addTelemetryProperty(anyString(), anyString());
  }

  @Test
  void shouldReportRuntimeTelemetry() {
    when(ctx.runtime().getApiVersion()).thenReturn(Version.create(10, 9));
    pluginTelemetry.reportTelemetry();
    verify(ctx).addTelemetryProperty("javascript.runtime.major-version", "22");
    verify(ctx).addTelemetryProperty("javascript.runtime.version", "22.9");
    verify(ctx).addTelemetryProperty("javascript.runtime.node-executable-origin", "embedded");
  }

  @Test
  void shouldReportProjectTelemetry() {
    when(ctx.runtime().getApiVersion()).thenReturn(Version.create(10, 9));
    var projectTelemetry = new ProjectAnalysisTelemetry(
      List.of("7.0.0-dev.20260316.1", "7.1.0"),
      true,
      Map.of("module", List.of("nodenext", "esnext"), "lib", List.of("dom", "es2022")),
      List.of("ES2022", "ES2024"),
      new ProgramCreationTelemetry(3, 2, 1),
      4,
      1
    );

    new PluginTelemetry(jsTsContext, server, projectTelemetry).reportTelemetry();

    verify(ctx).addTelemetryProperty(
      "javascript.telemetry.typescript.versions",
      "7.0.0-dev.20260316.1,7.1.0"
    );
    verify(ctx).addTelemetryProperty("javascript.telemetry.typescript.native-preview", "true");
    verify(ctx).addTelemetryProperty(
      "javascript.telemetry.typescript.compiler-options.module",
      "esnext,nodenext"
    );
    verify(ctx).addTelemetryProperty(
      "javascript.telemetry.typescript.compiler-options.lib",
      "dom,es2022"
    );
    verify(ctx).addTelemetryProperty("javascript.telemetry.ecmascript.versions", "ES2022,ES2024");
    verify(ctx).addTelemetryProperty(
      "javascript.telemetry.typescript.program-creation.attempted",
      "3"
    );
    verify(ctx).addTelemetryProperty(
      "javascript.telemetry.typescript.program-creation.succeeded",
      "2"
    );
    verify(ctx).addTelemetryProperty(
      "javascript.telemetry.typescript.program-creation.failed",
      "1"
    );
    verify(ctx).addTelemetryProperty("javascript.telemetry.module-type.esm-file-count", "4");
    verify(ctx).addTelemetryProperty("javascript.telemetry.module-type.cjs-file-count", "1");
    verify(ctx, times(13)).addTelemetryProperty(anyString(), anyString());
  }
}
