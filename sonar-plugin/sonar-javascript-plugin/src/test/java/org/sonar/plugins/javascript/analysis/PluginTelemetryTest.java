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
    verify(ctx).addTelemetryProperty("javascript.pkg1", "1.0.0");
  }

  @Test
  void reportTelemetry_shouldHandleUnsupportedOperationException() {
    when(ctx.runtime().getApiVersion()).thenReturn(Version.create(10, 9));
    doThrow(new UnsupportedOperationException())
      .when(ctx)
      .addTelemetryProperty(anyString(), anyString());
    pluginTelemetry.reportTelemetry(telemetryResponse);
    // Verify that the exception is caught and no further exceptions are thrown
    verify(ctx).addTelemetryProperty("javascript.pkg1", "1.0.0");
  }
}
