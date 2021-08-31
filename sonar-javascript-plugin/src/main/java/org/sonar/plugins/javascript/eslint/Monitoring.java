/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.ManifestUtils;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.api.sonarlint.SonarLintSide;

import static org.sonar.plugins.javascript.eslint.Monitoring.Metric.MetricType.FILE;
import static org.sonar.plugins.javascript.eslint.Monitoring.Metric.MetricType.SENSOR;

@ScannerSide
@SonarLintSide
public class Monitoring implements Startable {

  private static final Logger LOG = Loggers.get(Monitoring.class);

  private static final String MONITORING_ON = "sonar.javascript.monitoring";
  private static final String MONITORING_PATH = "sonar.javascript.monitoring.path";

  private final List<Metric> metrics = new ArrayList<>();

  private SensorContext sensorContext;
  private boolean enabled;
  private Sensor sensor;
  private SensorMetric sensorMetric;
  private FileMetric fileMetric;

  void startSensor(SensorContext sensorContext, Sensor sensor) {
    this.enabled = isMonitoringEnabled(sensorContext);
    if (!enabled) {
      return;
    }
    this.sensorContext = sensorContext;
    this.sensor = sensor;
    sensorMetric = new SensorMetric();
    sensorMetric.duration = new Duration();
  }

  void stopSensor() {
    if (!enabled) {
      return;
    }
    sensorMetric.durationMs = sensorMetric.duration.stop();
    sensorMetric.component = sensor.getClass().getCanonicalName();
    sensorMetric.projectKey = sensorContext.project().key();
    metrics.add(sensorMetric);
  }

  void startFile(InputFile inputFile) {
    if (!enabled) {
      return;
    }
    fileMetric = new FileMetric();
    fileMetric.duration = new Duration();
    fileMetric.component = inputFile.toString();
    sensorMetric.fileCount++;
  }

  public void stopFile(InputFile inputFile, int ncloc, EslintBridgeServer.Perf perf) {
    if (!enabled) {
      return;
    }
    fileMetric.durationMs = fileMetric.duration.stop();
    if (!fileMetric.component.equals(inputFile.toString())) {
      throw new IllegalStateException("Mismatched Monitoring.startFile / stopFile");
    }
    fileMetric.ncloc = ncloc;
    fileMetric.parseTimeMs = perf.parseTimeMs;
    fileMetric.analysisTimeMs = perf.analysisTimeMs;
    metrics.add(fileMetric);
  }

  @Override
  public void start() {
    // not used
  }

  @Override
  public void stop() {
    if (!enabled) {
      return;
    }
    saveMetrics();
  }

  private void saveMetrics() {
    Path monitoringPath = monitoringPath();
    Gson gson = new GsonBuilder().create();
    try {
      Path path = monitoringPath.resolve("metrics.json");
      LOG.info("Saving performance metrics to {}", path);
      Files.createDirectories(monitoringPath);
      try (BufferedWriter bw = Files.newBufferedWriter(path)) {
        for (Metric metric : metrics) {
          // each metric is written on separate line - this format is used by AWS Athena
          bw.write(gson.toJson(metric) + "\n");
        }
      }
    } catch (IOException e) {
      LOG.error("Failed to save metrics", e);
      throw new IllegalStateException("Failed to write metrics", e);
    }
  }

  private static boolean isMonitoringEnabled(SensorContext context) {
    return context.config().getBoolean(MONITORING_ON).orElse(false);
  }

  private Path monitoringPath() {
    return sensorContext.config().get(MONITORING_PATH).map(Paths::get)
      .orElse(sensorContext.fileSystem().workDir().toPath());
  }

  static class Metric implements Serializable {

    enum MetricType {
      SENSOR, FILE
    }

    final MetricType metricType;
    String component;
    String projectKey;
    String pluginVersion;
    String pluginBuild;
    // transient to exclude field from json
    transient Duration duration;

    Metric(MetricType metricType) {
      pluginVersion = Metric.class.getPackage().getImplementationVersion();
      pluginBuild = ManifestUtils.getPropertyValues(Metric.class.getClassLoader(), "Implementation-Build").get(0);
      this.metricType = metricType;
    }
  }

  static class SensorMetric extends Metric {
    int fileCount;
    long durationMs;

    SensorMetric() {
      super(SENSOR);
    }
  }

  static class FileMetric extends Metric {
    int ncloc;
    int parseTimeMs;
    int analysisTimeMs;
    long durationMs;

    FileMetric() {
      super(FILE);
    }
  }

  static class Duration {

    final long start;

    Duration() {
      start = System.nanoTime();
    }

    long stop() {
      return (System.nanoTime() - start) / 1_000_000;
    }
  }

}
