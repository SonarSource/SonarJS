/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2016 SonarSource SA
 * mailto:contact AT sonarsource DOT com
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
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import org.apache.commons.lang.StringUtils;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.coverage.CoverageType;
import org.sonar.api.batch.sensor.coverage.NewCoverage;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;

abstract class LCOVCoverageSensor {
  private static final Logger LOG = Loggers.get(UTCoverageSensor.class);

  private boolean isAtLeastSq62;
  protected abstract String[] reportPathProperties();
  protected abstract CoverageType getCoverageType();

  private static FilePredicate mainFilePredicate(FileSystem fileSystem) {
    return fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
  }

  public void execute(SensorContext context, Map<InputFile, Set<Integer>> linesOfCode, boolean isAtLeastSq62) {
    this.isAtLeastSq62 = isAtLeastSq62;

    if (isLCOVReportProvided(context)) {
      saveMeasureFromLCOVFile(context, linesOfCode);
    } else if (!isAtLeastSq62 && isForceZeroCoverageActivated(context)) {
      saveZeroValueForAllFiles(context, linesOfCode);
    }
  }

  private boolean isLCOVReportProvided(SensorContext context) {
    for(String reportPathProperty: reportPathProperties()){
      if (StringUtils.isNotBlank(context.settings().getString(reportPathProperty))){
        return true;
      }
    }
    return false;
  }

  private void saveMeasureFromLCOVFile(SensorContext context, Map<InputFile, Set<Integer>> linesOfCode) {
    LinkedList<File> lcovFiles=new LinkedList<>();
    for(String reportPathProperty: reportPathProperties()) {
      String providedPath = context.settings().getString(reportPathProperty);
      if (StringUtils.isBlank(providedPath)){
        continue;
      }
      File lcovFile = getIOFile(context.fileSystem().baseDir(), providedPath);

      if (lcovFile.isFile()) {
        lcovFiles.add(lcovFile);
      } else {
        LOG.warn("No coverage information will be saved because LCOV file cannot be found.");
        LOG.warn("Provided LCOV file path: {}. Seek file with path: {}", providedPath, lcovFile.getAbsolutePath());
      }
    }

    if(lcovFiles.isEmpty()) {
      LOG.warn("No coverage information will be saved because all LCOV files cannot be found.");
      return;
    }

    LOG.info("Analysing {}", lcovFiles);

    LCOVParser parser = LCOVParser.create(context, lcovFiles.toArray(new File[lcovFiles.size()]));
    Map<InputFile, NewCoverage> coveredFiles = parser.coverageByFile();

    FileSystem fileSystem = context.fileSystem();
    FilePredicate mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));

    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)) {
      NewCoverage fileCoverage = coveredFiles.get(inputFile);

      if (fileCoverage != null) {
        fileCoverage
          .ofType(getCoverageType())
          .save();

      } else if (!isAtLeastSq62) {
        // colour all lines as not executed
        LOG.debug("Default value of zero will be saved for file: {}", inputFile.relativePath());
        LOG.debug("Because was not present in LCOV report.");
        saveZeroValue(inputFile, context, linesOfCode.get(inputFile));
      }
    }

    List<String> unresolvedPaths = parser.unresolvedPaths();
    if (!unresolvedPaths.isEmpty()) {
      LOG.warn(
        String.format(
          "Could not resolve %d file paths in %s, first unresolved path: %s",
          unresolvedPaths.size(), lcovFiles, unresolvedPaths.get(0)));
    }
  }

  private void saveZeroValueForAllFiles(SensorContext context, Map<InputFile, Set<Integer>> linesOfCode) {
    for (InputFile inputFile : context.fileSystem().inputFiles(mainFilePredicate(context.fileSystem()))) {
      saveZeroValue(inputFile, context, linesOfCode.get(inputFile));
    }
  }

  private void saveZeroValue(InputFile inputFile, SensorContext context, @Nullable Set<Integer> linesOfCode) {
    // linesOfCode is null if file was not parsed (e.g. parsing error or minified file)
    if (linesOfCode != null) {
      NewCoverage newCoverage = context.newCoverage()
        .onFile(inputFile)
        .ofType(getCoverageType());

      linesOfCode.forEach((Integer line) -> newCoverage.lineHits(line, 0));
      newCoverage.save();
    }
  }

  private static boolean isForceZeroCoverageActivated(SensorContext context) {
    return context.settings().getBoolean(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY);
  }

  /**
   * Returns a java.io.File for the given path.
   * If path is not absolute, returns a File with module base directory as parent path.
   */
  private static File getIOFile(File baseDir, String path) {
    File file = new File(path);
    if (!file.isAbsolute()) {
      file = new File(baseDir, path);
    }

    return file;
  }
}
