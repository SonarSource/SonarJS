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

import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.BridgeServer.Dependency;
import org.sonar.plugins.javascript.bridge.BridgeServer.TelemetryResponse;

class PluginTelemetryTest {

  private SensorContext ctx;
  private PluginTelemetry pluginTelemetry;
  private TelemetryResponse telemetryResponse;

  @BeforeEach
  void setUp() {
    ctx = mock(SensorContext.class);
    SonarRuntime sonarRuntime = mock(SonarRuntime.class);
    when(ctx.runtime()).thenReturn(sonarRuntime);
    pluginTelemetry = new PluginTelemetry(ctx);
    telemetryResponse = new TelemetryResponse(List.of(new Dependency("pkg1", "1.0.0")));
  }

  @Test
  void shouldNotReportIfApiVersionIsLessThan109() {
    when(ctx.runtime().getApiVersion()).thenReturn(Version.create(10, 8));
    pluginTelemetry.reportTelemetry(telemetryResponse);
    verify(ctx, never()).addTelemetryProperty(anyString(), anyString());
  }

  @Test
  void shouldReportIfApiVersionIsGreaterThanOrEqualTo109() {
    when(ctx.runtime().getApiVersion()).thenReturn(Version.create(10, 9));
    pluginTelemetry.reportTelemetry(telemetryResponse);
    verify(ctx).addTelemetryProperty("javascript.dependency.pkg1", "1.0.0");
  }
}
