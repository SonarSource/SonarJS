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
package org.sonar.plugins.javascript.bridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.google.gson.Gson;
import java.io.BufferedReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;

class MonitoringTest {

  @TempDir
  Path baseDir;

  @TempDir
  Path monitoringPath;

  Gson gson = new Gson();

  Monitoring monitoring;
  private SensorContextTester sensorContextTester;

  @BeforeEach
  void beforeEach() {
    MapSettings settings = new MapSettings();
    settings.setProperty("sonar.javascript.monitoring", true);
    settings.setProperty("sonar.javascript.monitoring.path", monitoringPath.toString());
    sensorContextTester = SensorContextTester.create(baseDir);
    monitoring = new Monitoring(settings.asConfig());
  }

  @Test
  void test_sensor() throws Exception {
    TestSensor sensor = new TestSensor();
    monitoring.startSensor(sensorContextTester, sensor);
    sleep();
    monitoring.stopSensor();
    monitoring.stop();
    Path metricsPath = monitoringPath.resolve("metrics.json");
    assertThat(metricsPath).exists();
    try (BufferedReader br = Files.newBufferedReader(metricsPath)) {
      Monitoring.SensorMetric sensorMetric = gson.fromJson(br, Monitoring.SensorMetric.class);
      assertThat(sensorMetric.component).isEqualTo(TestSensor.class.getCanonicalName());
      assertThat(sensorMetric.duration).isGreaterThan(100);
      assertThat(sensorMetric.canSkipUnchangedFiles).isFalse();
    }
  }

  @Test
  void test_not_enabled() throws Exception {
    Monitoring monitoring = new Monitoring(new MapSettings().asConfig());
    TestSensor sensor = new TestSensor();
    SensorContextTester sensorContextTester = SensorContextTester.create(baseDir);
    monitoring.startSensor(sensorContextTester, sensor);
    DefaultInputFile inputFile = TestInputFileBuilder.create("module", "path").build();
    monitoring.startFile(inputFile);
    monitoring.stopFile(inputFile, 0, new BridgeServer.Perf());
    monitoring.stopSensor();
    monitoring.stop();
    Path metricsPath = monitoringPath.resolve("metrics.json");
    assertThat(metricsPath).doesNotExist();
  }

  @Test
  void test_file() throws Exception {
    TestSensor sensor = new TestSensor();
    monitoring.startSensor(sensorContextTester, sensor);
    DefaultInputFile inputFile = TestInputFileBuilder.create("module", "path").build();
    monitoring.startFile(inputFile);
    BridgeServer.Perf perf = new BridgeServer.Perf();
    perf.analysisTime = 2;
    perf.parseTime = 3;
    monitoring.stopFile(inputFile, 4, perf);
    monitoring.stopSensor();
    monitoring.stop();
    Path metricsPath = monitoringPath.resolve("metrics.json");
    assertThat(metricsPath).exists();
    try (BufferedReader br = Files.newBufferedReader(metricsPath)) {
      Monitoring.FileMetric fileMetric = gson.fromJson(br.readLine(), Monitoring.FileMetric.class);
      assertThat(fileMetric.component).isEqualTo("path");
      assertThat(fileMetric.analysisTime).isEqualTo(2);
      assertThat(fileMetric.parseTime).isEqualTo(3);
      assertThat(fileMetric.ncloc).isEqualTo(4);
      assertThat(fileMetric.ordinal).isZero();
      assertThat(fileMetric.timestamp)
        .startsWith(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH")));
      assertThat(fileMetric.executionId).isNotEmpty();
      assertThat(fileMetric.canSkipUnchangedFiles).isFalse();
    }
  }

  @Test
  void test_file_mismatch() throws Exception {
    TestSensor sensor = new TestSensor();
    monitoring.startSensor(sensorContextTester, sensor);
    DefaultInputFile file1 = TestInputFileBuilder.create("module", "file1").build();
    DefaultInputFile file2 = TestInputFileBuilder.create("module", "file2").build();
    monitoring.startFile(file1);
    monitoring.startFile(file2);
    BridgeServer.Perf perf = new BridgeServer.Perf();
    assertThatThrownBy(() -> monitoring.stopFile(file1, 0, perf))
      .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void test_program_metric() {
    monitoring.startSensor(sensorContextTester, new TestSensor());
    monitoring.startProgram("tsconfig.json");
    monitoring.stopProgram();
    monitoring.startProgram("tsconfig2.json");
    monitoring.stopProgram();
    assertThat(monitoring.metrics())
      .extracting(m -> ((Monitoring.ProgramMetric) m).tsConfig)
      .containsExactly("tsconfig.json", "tsconfig2.json");
    var metric = monitoring.metrics().get(0);
    assertThat(metric.timestamp)
      .startsWith(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH")));
    assertThat(metric.executionId).isNotEmpty();
    assertThat(metric.canSkipUnchangedFiles).isFalse();
  }

  @Test
  void test_can_skip_unchanged_files() {
    SensorContextTester sensorContextTester = SensorContextTester.create(baseDir);
    sensorContextTester.setCanSkipUnchangedFiles(true);
    monitoring.startSensor(sensorContextTester, new TestSensor());
    monitoring.stopSensor();
    var metric = monitoring.metrics().get(0);
    assertThat(metric.canSkipUnchangedFiles).isTrue();
  }

  @Test
  void test_can_not_skip_unchanged_files() {
    SensorContextTester sensorContextTester = SensorContextTester.create(baseDir);
    sensorContextTester.setRuntime(
      SonarRuntimeImpl.forSonarQube(
        Version.create(9, 3),
        SonarQubeSide.SCANNER,
        SonarEdition.COMMUNITY
      )
    );
    sensorContextTester.setCanSkipUnchangedFiles(true);
    monitoring.startSensor(sensorContextTester, new TestSensor());
    monitoring.stopSensor();
    var metric = monitoring.metrics().get(0);
    assertThat(metric.canSkipUnchangedFiles).isFalse();
  }

  static class TestSensor implements Sensor {

    @Override
    public void describe(SensorDescriptor descriptor) {}

    @Override
    public void execute(SensorContext context) {}
  }

  static void sleep() {
    try {
      Thread.sleep(100);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
