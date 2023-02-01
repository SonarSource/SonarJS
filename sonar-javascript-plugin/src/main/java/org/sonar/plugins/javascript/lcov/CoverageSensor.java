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
package org.sonar.plugins.javascript.lcov;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.coverage.NewCoverage;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonarsource.analyzer.commons.FileProvider;

public class CoverageSensor implements Sensor {
  private static final Logger LOG = Loggers.get(CoverageSensor.class);

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .onlyWhenConfiguration(conf -> conf.hasKey(JavaScriptPlugin.LCOV_REPORT_PATHS) || conf.hasKey(JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS))
      .name("JavaScript/TypeScript Coverage")
      .onlyOnFileType(Type.MAIN);
  }

  @Override
  public void execute(SensorContext context) {
    Set<String> reports = new HashSet<>(Arrays.asList(context.config().getStringArray(JavaScriptPlugin.LCOV_REPORT_PATHS)));
    reports.addAll(Arrays.asList(context.config().getStringArray(JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS)));
    logIfUsedProperty(context, JavaScriptPlugin.LCOV_REPORT_PATHS);
    logIfUsedProperty(context, JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS);
    if (context.config().hasKey(JavaScriptPlugin.LCOV_REPORT_PATHS) && context.config().hasKey(JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS)) {
      LOG.info(String.format("Merging coverage reports from %s and %s.", JavaScriptPlugin.LCOV_REPORT_PATHS, JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS));
    }
    List<File> lcovFiles = getLcovFiles(context.fileSystem().baseDir(), reports);
    if (lcovFiles.isEmpty()) {
      LOG.warn("No coverage information will be saved because all LCOV files cannot be found.");
      return;
    }
    saveCoverageFromLcovFiles(context, lcovFiles);
  }

  private static List<File> getLcovFiles(File baseDir, Set<String> reportPaths) {
    List<File> lcovFiles = new ArrayList<>();
    for (String reportPath : reportPaths) {
      LOG.debug("Using '{}' to resolve LCOV files", reportPath);

      File fileByHardcodedPath = getFileByHardcodedPath(baseDir, reportPath);
      if (fileByHardcodedPath != null) {
        lcovFiles.add(fileByHardcodedPath);
        continue;
      }

      FileProvider fileProvider = new FileProvider(baseDir, reportPath);
      List<File> matchingFiles = fileProvider.getMatchingFiles();
      if (matchingFiles.isEmpty()) {
        LOG.info("No LCOV files were found using {}", reportPath);
      }
      lcovFiles.addAll(matchingFiles);
    }
    return lcovFiles;
  }

  private static void saveCoverageFromLcovFiles(SensorContext context, List<File> lcovFiles) {
    LOG.info("Analysing {}", lcovFiles);

    FileSystem fileSystem = context.fileSystem();
    FilePredicate mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(Type.MAIN),
      fileSystem.predicates().hasLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY));
    FileLocator fileLocator = new FileLocator(fileSystem.inputFiles(mainFilePredicate));

    LCOVParser parser = LCOVParser.create(context, lcovFiles, fileLocator);
    Map<InputFile, NewCoverage> coveredFiles = parser.coverageByFile();

    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)) {
      NewCoverage fileCoverage = coveredFiles.get(inputFile);

      if (fileCoverage != null) {
        fileCoverage.save();
      }
    }

    List<String> unresolvedPaths = parser.unresolvedPaths();
    if (!unresolvedPaths.isEmpty()) {
      LOG.warn(String.format("Could not resolve %d file paths in %s", unresolvedPaths.size(), lcovFiles));
      if (LOG.isDebugEnabled()) {
        LOG.debug("Unresolved paths:\n" + String.join("\n", unresolvedPaths));
      } else {
        LOG.warn("First unresolved path: " + unresolvedPaths.get(0) + " (Run in DEBUG mode to get full list of unresolved paths)");
      }
    }

    int inconsistenciesNumber = parser.inconsistenciesNumber();
    if (inconsistenciesNumber > 0) {
      LOG.warn("Found {} inconsistencies in coverage report. Re-run analyse in debug mode to see details.", inconsistenciesNumber);
    }
  }

  private static File getFileByHardcodedPath(File baseDir, String path) {
    File file = new File(path);
    if (!file.isAbsolute()) {
      file = new File(baseDir, path);
    }
    if (!file.isFile()) {
      return null;
    }
    return file;
  }

  private static void logIfUsedProperty(SensorContext context, String property) {
    if (context.config().hasKey(property)) {
      LOG.debug(String.format("Property %s is used.", property));
    }
  }
}
