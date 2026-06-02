/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import java.io.File;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide
public class WebSensorModuleConfiguration {

  private final Set<String> collectedTsConfigPaths = new LinkedHashSet<>();
  private final Map<String, EslintReportImporter.PreparedReport> collectedEslintReports =
    new LinkedHashMap<>();
  private final EslintReportImporter eslintReportImporter = new EslintReportImporter();

  public synchronized void clear() {
    collectedTsConfigPaths.clear();
    collectedEslintReports.clear();
  }

  public synchronized void collect(SensorContext sensorContext) {
    collectedTsConfigPaths.addAll(resolveTsConfigPaths(new JsTsContext<>(sensorContext)));
    addReports(collectedEslintReports, eslintReportImporter.prepareReports(sensorContext));
  }

  public synchronized Set<String> tsConfigPaths(JsTsContext<?> context) {
    var resolvedPaths = resolveTsConfigPaths(context);
    resolvedPaths.addAll(collectedTsConfigPaths);
    return resolvedPaths;
  }

  public synchronized List<EslintReportImporter.PreparedReport> eslintReports(
    SensorContext sensorContext
  ) {
    var mergedReports = new LinkedHashMap<String, EslintReportImporter.PreparedReport>();
    addReports(mergedReports, eslintReportImporter.prepareReports(sensorContext));
    addReports(mergedReports, collectedEslintReports.values());
    return List.copyOf(mergedReports.values());
  }

  private static LinkedHashSet<String> resolveTsConfigPaths(JsTsContext<?> context) {
    var baseDir = context.getSensorContext().fileSystem().baseDir().toPath();
    var resolvedPaths = new LinkedHashSet<String>();
    for (String tsConfigPath : context.getTsConfigPaths()) {
      resolvedPaths.add(resolvePath(baseDir, tsConfigPath));
    }
    return resolvedPaths;
  }

  private static void addReports(
    Map<String, EslintReportImporter.PreparedReport> target,
    Iterable<EslintReportImporter.PreparedReport> reports
  ) {
    for (var report : reports) {
      target.putIfAbsent(normalize(report.reportFile()), report);
    }
  }

  private static String resolvePath(Path baseDir, String path) {
    Path resolvedPath = Path.of(path);
    if (!resolvedPath.isAbsolute()) {
      resolvedPath = baseDir.resolve(path);
    }
    return normalize(resolvedPath.toFile());
  }

  private static String normalize(File file) {
    return file.toPath().toAbsolutePath().normalize().toString();
  }
}
