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
package org.sonar.plugins.javascript.lcov;

import static org.sonar.plugins.javascript.JavaScriptPlugin.LCOV_REPORT_PATHS;
import static org.sonar.plugins.javascript.JavaScriptPlugin.LCOV_REPORT_PATHS_ALIAS;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.coverage.NewCoverage;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonarsource.analyzer.commons.FileProvider;

public class CoverageSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(CoverageSensor.class);

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .onlyWhenConfiguration(conf ->
        conf.hasKey(LCOV_REPORT_PATHS) ||
        conf.hasKey(LCOV_REPORT_PATHS_ALIAS)
      )
      .name("JavaScript/TypeScript Coverage")
      .onlyOnFileType(Type.MAIN);
  }

  @Override
  public void execute(SensorContext context) {
    Set<String> reports = new HashSet<>(
      Arrays.asList(context.config().getStringArray(LCOV_REPORT_PATHS))
    );
    reports.addAll(
      Arrays.asList(context.config().getStringArray(LCOV_REPORT_PATHS_ALIAS))
    );
    logIfUsedProperty(context, LCOV_REPORT_PATHS);
    logIfUsedProperty(context, LCOV_REPORT_PATHS_ALIAS);
    if (
      context.config().hasKey(LCOV_REPORT_PATHS) &&
      context.config().hasKey(LCOV_REPORT_PATHS_ALIAS)
    ) {
      LOG.info("Merging coverage reports from {} and {}.", LCOV_REPORT_PATHS, LCOV_REPORT_PATHS_ALIAS
      );
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
    FilePredicate mainFilePredicate = fileSystem
      .predicates()
      .and(
        fileSystem.predicates().hasType(Type.MAIN),
        fileSystem.predicates().hasLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      );
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
      LOG.warn("Could not resolve {} file paths in {}", unresolvedPaths.size(), lcovFiles);
      if (LOG.isDebugEnabled()) {
        LOG.debug("Unresolved paths:\n{}", String.join("\n", unresolvedPaths));
      } else {
        LOG.warn(
          "First unresolved path: {} (Run in DEBUG mode to get full list of unresolved paths)", unresolvedPaths.get(0));
      }
    }

    int inconsistenciesNumber = parser.inconsistenciesNumber();
    if (inconsistenciesNumber > 0) {
      LOG.warn(
        "Found {} inconsistencies in coverage report. Re-run analyse in debug mode to see details.",
        inconsistenciesNumber
      );
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
