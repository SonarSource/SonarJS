/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * dev@sonar.codehaus.org
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
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */
package org.sonar.plugins.javascript.lcov;

import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.CoverageMeasuresBuilder;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.PropertiesBuilder;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;

import java.io.File;
import java.util.Map;

public class CoverageSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(CoverageSensor.class);

  private final FileSystem fileSystem;
  private final Settings settings;
  private final FilePredicate mainFilePredicate;

  public CoverageSensor(FileSystem fileSystem, Settings settings) {
    this.fileSystem = fileSystem;
    this.settings = settings;
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScript.KEY));
  }

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return fileSystem.hasFiles(mainFilePredicate);
  }

  @Override
  public void analyse(Project project, SensorContext context) {
    if (isLCOVReportProvided()) {
      saveMeasureFromLCOVFile(context);

    } else if (isForceZeroCoverageActivated()) {
      saveZeroValueForAllFiles(context);
    }

    // Else, nothing to do, there will be no coverage information for JavaScript files.
  }

  protected void saveZeroValueForAllFiles(SensorContext context) {
    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)) {
      saveZeroValueForResource(org.sonar.api.resources.File.create(inputFile.relativePath()), context);
    }
  }

  protected void saveMeasureFromLCOVFile(SensorContext context) {
    String providedPath = settings.getString(JavaScriptPlugin.LCOV_REPORT_PATH);
    File lcovFile = getIOFile(fileSystem.baseDir(), providedPath);

    if (!lcovFile.isFile()) {
      LOG.warn("No coverage information will be saved because LCOV file cannot be found. Provided LCOV file path: {}", providedPath);
      LOG.warn("Provided LCOV file path: {}. Seek file with path: {}", providedPath, lcovFile.getAbsolutePath());
      return;
    }

    LOG.info("Analysing {}", lcovFile);

    LCOVParser parser = new LCOVParser(fileSystem);
    Map<InputFile, CoverageMeasuresBuilder> coveredFiles = parser.parseFile(lcovFile);

    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)) {
      try {
        CoverageMeasuresBuilder fileCoverage = coveredFiles.get(inputFile);
        org.sonar.api.resources.File resource = org.sonar.api.resources.File.create(inputFile.relativePath());

        if (fileCoverage != null) {
          for (Measure measure : fileCoverage.createMeasures()) {
            context.saveMeasure(resource, measure);
          }
        } else {
          // colour all lines as not executed
          LOG.debug("Default value of zero will be saved for file: {}", resource.getPath());
          LOG.debug("Because: either was not present in LCOV report either was not able to retrieve associated SonarQube resource");
          saveZeroValueForResource(resource, context);
        }
      } catch (Exception e) {
        LOG.error("Problem while calculating coverage for " + inputFile.absolutePath(), e);
      }
    }
  }

  private void saveZeroValueForResource(org.sonar.api.resources.File resource, SensorContext context) {
    PropertiesBuilder<Integer, Integer> lineHitsData = new PropertiesBuilder<Integer, Integer>(CoreMetrics.COVERAGE_LINE_HITS_DATA);

    for (int x = 1; x < context.getMeasure(resource, CoreMetrics.LINES).getIntValue(); x++) {
      lineHitsData.add(x, 0);
    }

    // use non comment lines of code for coverage calculation
    Measure ncloc = context.getMeasure(resource, CoreMetrics.NCLOC);
    context.saveMeasure(resource, lineHitsData.build());
    context.saveMeasure(resource, CoreMetrics.LINES_TO_COVER, ncloc.getValue());
    context.saveMeasure(resource, CoreMetrics.UNCOVERED_LINES, ncloc.getValue());
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

  private boolean isForceZeroCoverageActivated() {
    return settings.getBoolean(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY);
  }

  private boolean isLCOVReportProvided() {
    return StringUtils.isNotBlank(settings.getString(JavaScriptPlugin.LCOV_REPORT_PATH));
  }

  /**
   * Returns a java.io.File for the given path.
   * If path is not absolute, returns a File with module base directory as parent path.
   */
  public static File getIOFile(File baseDir, String path) {
    File file = new File(path);
    if (!file.isAbsolute()) {
      file = new File(baseDir, path);
    }

    return file;
  }

}
