package org.sonar.plugins.javascript.analysis;

import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.bridge.BridgeServer.Dependency;
import org.sonar.plugins.javascript.bridge.BridgeServer.TelemetryResponse;

public class PluginTelemetry {

  private static final Logger LOG = LoggerFactory.getLogger(PluginTelemetry.class);

  private final SensorContext ctx;
  private static final String KEY_PREFIX = "javascript.";

  public PluginTelemetry(SensorContext ctx) {
    this.ctx = ctx;
  }

  void reportTelemetry(TelemetryResponse telemetry) {
    var isTelemetrySupported = ctx
      .runtime()
      .getApiVersion()
      .isGreaterThanOrEqual(Version.create(10, 9));
    if (!isTelemetrySupported) {
      // addTelemetryProperty is added in 10.9:
      // https://github.com/SonarSource/sonar-plugin-api/releases/tag/10.9.0.2362
      return;
    }
    try {
      var keyMapToSave = telemetry
        .dependencies()
        .stream()
        .collect(
          Collectors.toMap(dependency -> KEY_PREFIX + dependency.name(), Dependency::version)
        );
      keyMapToSave.forEach(ctx::addTelemetryProperty);
      LOG.debug("Telemetry saved: {}", keyMapToSave);
    } catch (UnsupportedOperationException e) {
      // Ignore if api is not supported yet. In production, it is currently noop, but in tests it throws UnsupportedOperationException:
      // https://github.com/SonarSource/sonarqube/blob/10.7.0.96327/sonar-plugin-api-impl/src/main/java/org/sonar/api/batch/sensor/internal/SensorContextTester.java#L446
    }
  }
}
