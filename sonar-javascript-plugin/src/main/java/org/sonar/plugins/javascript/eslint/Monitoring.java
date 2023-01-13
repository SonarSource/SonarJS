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
package org.sonar.plugins.javascript.eslint;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.sonar.api.Startable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.config.Configuration;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.ManifestUtils;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.api.sonarlint.SonarLintSide;

import static org.sonar.plugins.javascript.eslint.Monitoring.MetricType.FILE;
import static org.sonar.plugins.javascript.eslint.Monitoring.MetricType.PROGRAM;
import static org.sonar.plugins.javascript.eslint.Monitoring.MetricType.RULE;
import static org.sonar.plugins.javascript.eslint.Monitoring.MetricType.SENSOR;
import static org.sonarsource.api.sonarlint.SonarLintSide.MULTIPLE_ANALYSES;

@ScannerSide
@SonarLintSide(lifespan = MULTIPLE_ANALYSES)
public class Monitoring implements Startable {

  private static final Logger LOG = Loggers.get(Monitoring.class);

  private static final String MONITORING_ON = "sonar.javascript.monitoring";
  private static final String MONITORING_PATH = "sonar.javascript.monitoring.path";

  private final List<Metric> metrics = new ArrayList<>();
  private final Configuration configuration;

  private boolean enabled;
  private boolean canSkipUnchangedFiles;
  private SensorMetric sensorMetric;
  private FileMetric fileMetric;
  private ProgramMetric programMetric;
  private final String executionId;

  public Monitoring(Configuration configuration) {
    this.configuration = configuration;
    this.executionId = UUID.randomUUID().toString();
  }

  void startSensor(SensorContext sensorContext, Sensor sensor) {
    this.enabled = isMonitoringEnabled();
    if (!enabled) {
      return;
    }
    if (AnalysisMode.isRuntimeApiCompatible(sensorContext)) {
      canSkipUnchangedFiles = sensorContext.canSkipUnchangedFiles();
    } else {
      canSkipUnchangedFiles = false;
    }
    sensorMetric = new SensorMetric(executionId, canSkipUnchangedFiles);
    sensorMetric.component = sensor.getClass().getCanonicalName();
    sensorMetric.projectKey = sensorContext.project().key();
  }

  void stopSensor() {
    if (!enabled) {
      return;
    }
    sensorMetric.duration = sensorMetric.clock.stop();
    metrics.add(sensorMetric);
  }

  void startFile(InputFile inputFile) {
    if (!enabled) {
      return;
    }
    fileMetric = new FileMetric(executionId, sensorMetric.projectKey, canSkipUnchangedFiles);
    fileMetric.component = inputFile.toString();
    fileMetric.ordinal = sensorMetric.fileCount;
    sensorMetric.fileCount++;
  }

  public void stopFile(InputFile inputFile, int ncloc, EslintBridgeServer.Perf perf) {
    if (!enabled) {
      return;
    }
    fileMetric.duration = fileMetric.clock.stop();
    if (!fileMetric.component.equals(inputFile.toString())) {
      throw new IllegalStateException("Mismatched Monitoring.startFile / stopFile");
    }
    fileMetric.ncloc = ncloc;
    fileMetric.parseTime = perf.parseTime;
    fileMetric.analysisTime = perf.analysisTime;
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
      LOG.info("Saving performance metrics with executionId {} to {}", executionId, path);
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

  public boolean isMonitoringEnabled() {
    return configuration.getBoolean(MONITORING_ON).orElse(false);
  }

  private Path monitoringPath() {
    return configuration.get(MONITORING_PATH).map(Paths::get)
      .orElseThrow(() -> new IllegalStateException("Monitoring path " + MONITORING_PATH + " not configured"));
  }

  public void ruleStatistics(String ruleKey, double timeMs, double relative) {
    var ruleMetric = new RuleMetric(ruleKey, timeMs, relative, sensorMetric.projectKey, executionId, canSkipUnchangedFiles);
    metrics.add(ruleMetric);
  }

  public void startProgram(String tsConfig) {
    if (!enabled) {
      return;
    }
    programMetric = new ProgramMetric(tsConfig, executionId, sensorMetric.projectKey, canSkipUnchangedFiles);
  }

  public void stopProgram() {
    if (!enabled) {
      return;
    }
    programMetric.duration = programMetric.clock.stop();
    metrics.add(programMetric);
  }

  List<Metric> metrics() {
    return metrics;
  }

  enum MetricType {
    SENSOR, FILE, RULE, PROGRAM
  }


  static class Metric implements Serializable {

    final MetricType metricType;
    boolean canSkipUnchangedFiles;
    String component;
    String projectKey;
    String pluginVersion;
    // sha of the commit
    String pluginBuild;
    final String executionId;
    final String timestamp;
    // transient to exclude field from json
    transient Clock clock = new Clock();

    Metric(MetricType metricType, String executionId, boolean canSkipUnchangedFiles) {
      this.executionId = executionId;
      pluginVersion = PluginInfo.getVersion();
      pluginBuild = ManifestUtils.getPropertyValues(Metric.class.getClassLoader(), "Implementation-Build").get(0);
      this.metricType = metricType;
      this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"));
      this.canSkipUnchangedFiles = canSkipUnchangedFiles;
    }
  }

  static class SensorMetric extends Metric {
    int fileCount;
    long duration;

    SensorMetric(String executionId, boolean canSkipUnchangedFiles) {
      super(SENSOR, executionId, canSkipUnchangedFiles);
    }
  }

  static class FileMetric extends Metric {
    // order of file in the project in which it was analyzed. 1 - first file, ....
    int ordinal;
    int ncloc;
    // time is measured in microseconds
    int parseTime;
    int analysisTime;
    long duration;

    FileMetric(String executionId, String projectKey, boolean canSkipUnchangedFiles) {
      super(FILE, executionId, canSkipUnchangedFiles);
      this.projectKey = projectKey;
    }
  }

  static class Clock {

    final long start;

    Clock() {
      start = System.nanoTime();
    }

    long stop() {
      return (System.nanoTime() - start) / 1_000;
    }
  }

  static class RuleMetric extends Metric {

    String ruleKey;
    double timeMs;
    double timeRelative;

    RuleMetric(String ruleKey, double timeMs, double timeRelative, String projectKey, String executionId, boolean canSkipUnchangedFiles) {
      super(RULE, executionId, canSkipUnchangedFiles);
      this.ruleKey = ruleKey;
      this.timeMs = timeMs;
      this.timeRelative = timeRelative;
      this.projectKey = projectKey;
    }
  }

  static class ProgramMetric extends Metric {

    String tsConfig;
    long duration;

    ProgramMetric(String tsConfig, String executionId, String projectKey, boolean canSkipUnchangedFiles) {
      super(PROGRAM, executionId, canSkipUnchangedFiles);
      this.tsConfig = tsConfig;
      this.projectKey = projectKey;
    }
  }

}
