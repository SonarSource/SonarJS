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

import com.google.common.collect.ImmutableList;
import java.io.File;
import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;
import org.apache.commons.lang.StringUtils;
import org.sonar.api.batch.DependsUpon;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.CoverageMeasuresBuilder;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.Metric;
import org.sonar.api.measures.PropertiesBuilder;
import org.sonar.api.resources.Project;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptPlugin;

public abstract class LCOVCoverageSensor implements Sensor {
  private static final Logger LOG = Loggers.get(UTCoverageSensor.class);
  protected final FileSystem fileSystem;
  protected final Settings settings;
  protected final FilePredicate mainFilePredicate;
  protected Metric linesToCoverMetric;
  protected Metric uncoveredLinesMetric;
  protected Metric coverageLineHitsDataMetric;
  protected Metric coveredConditionsByLineMetric;
  protected Metric conditionsByLineMetric;
  protected Metric uncoveredConditionsMetric;
  protected Metric conditionsToCoverMetric;
  protected String[] reportPaths;

  public LCOVCoverageSensor(FileSystem fileSystem, Settings settings) {
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    this.fileSystem = fileSystem;
    this.settings = settings;
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

  private static void checkDataIsNotNull(@Nullable String data) {
    if (data == null) {
      throw new IllegalStateException("Measure data is null but it shouldn't be");
    }
  }

  @DependsUpon
  public Collection<Metric> dependsUponMetrics() {
    return ImmutableList.<Metric>of(CoreMetrics.NCLOC, CoreMetrics.NCLOC_DATA);
  }

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return fileSystem.hasFiles(mainFilePredicate);
  }

  @Override
  public void analyse(Project module, SensorContext context) {
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
    LinkedList<File> lcovFiles=new LinkedList<>();
    for(String reportPath: reportPaths) {
      String providedPath = settings.getString(reportPath);
      if (StringUtils.isBlank(providedPath)){
        continue;
      }
      File lcovFile = getIOFile(fileSystem.baseDir(), providedPath);

      if (lcovFile.isFile()) {
        lcovFiles.add(lcovFile);
      } else {
        LOG.warn("No coverage information will be saved because LCOV file cannot be found. Provided LCOV file path: {}", providedPath);
        LOG.warn("Provided LCOV file path: {}. Seek file with path: {}", providedPath, lcovFile.getAbsolutePath());
      }
    }

    if(lcovFiles.isEmpty()) {
      LOG.warn("No coverage information will be saved because all LCOV files cannot be found.");
      return;
    }


    LOG.info("Analysing {}", lcovFiles);

    LCOVParser parser = LCOVParser.create(fileSystem, lcovFiles.toArray(new File[lcovFiles.size()]));
    Map<InputFile, CoverageMeasuresBuilder> coveredFiles = parser.coverageByFile();

    for (InputFile inputFile : fileSystem.inputFiles(mainFilePredicate)) {
      try {
        CoverageMeasuresBuilder fileCoverage = coveredFiles.get(inputFile);
        org.sonar.api.resources.File resource = org.sonar.api.resources.File.create(inputFile.relativePath());

        if (fileCoverage != null) {
          for (Measure measure : fileCoverage.createMeasures()) {
            context.saveMeasure(resource, convertMeasure(measure));
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

    List<String> unresolvedPaths = parser.unresolvedPaths();
    if (!unresolvedPaths.isEmpty()) {
      LOG.warn(
        String.format(
          "Could not resolve %d file paths in %s, first unresolved path: %s",
          unresolvedPaths.size(), lcovFiles, unresolvedPaths.get(0)));
    }
  }

  private void saveZeroValueForResource(org.sonar.api.resources.File resource, SensorContext context) {
    // use non comment lines of code for coverage calculation
    Measure<Integer> nclocMeasure = context.getMeasure(resource, CoreMetrics.NCLOC);
    if (nclocMeasure != null) {
      double ncloc = nclocMeasure.getValue();
      context.saveMeasure(resource, getZeroCoverageLineHitsDataMetric(resource, context));
      context.saveMeasure(resource, linesToCoverMetric, ncloc);
      context.saveMeasure(resource, uncoveredLinesMetric, ncloc);
    }
  }

  private Measure getZeroCoverageLineHitsDataMetric(org.sonar.api.resources.File resource, SensorContext context) {
    PropertiesBuilder<Integer, Integer> lineHitsData = new PropertiesBuilder<>(coverageLineHitsDataMetric);
    Measure<String> nclocDataMeasure = context.getMeasure(resource, CoreMetrics.NCLOC_DATA);
    if (nclocDataMeasure != null) {
      String nclocData = nclocDataMeasure.getData();
      if (nclocData == null) {
        return lineHitsData.build();
      }
      String[] lines = nclocData.split(";");
      for (String line : lines) {
        String[] info = line.split("=");
        if (info.length == 2 && "1".equals(info[1])) {
          int lineNumber = Integer.parseInt(info[0]);
          lineHitsData.add(lineNumber, 0);
        }
      }
    }
    return lineHitsData.build();
  }

  private boolean isForceZeroCoverageActivated() {
    return settings.getBoolean(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY);
  }

  private boolean isLCOVReportProvided() {
    for(String reportPath:reportPaths){
      if (StringUtils.isNotBlank(settings.getString(reportPath))){
        return true;
      }
    }
    return false;
  }

  private Measure convertMeasure(Measure measure) {
    Measure itMeasure = null;
    Metric metric = measure.getMetric();
    Double value = measure.getValue();
    String data = measure.getData();
    if (CoreMetrics.LINES_TO_COVER.equals(metric)) {
      itMeasure = new Measure(linesToCoverMetric, value);
    } else if (CoreMetrics.UNCOVERED_LINES.equals(metric)) {
      itMeasure = new Measure(uncoveredLinesMetric, value);
    } else if (CoreMetrics.COVERAGE_LINE_HITS_DATA.equals(metric)) {
      checkDataIsNotNull(data);
      itMeasure = new Measure(coverageLineHitsDataMetric, data);
    } else if (CoreMetrics.CONDITIONS_TO_COVER.equals(metric)) {
      itMeasure = new Measure(conditionsToCoverMetric, value);
    } else if (CoreMetrics.UNCOVERED_CONDITIONS.equals(metric)) {
      itMeasure = new Measure(uncoveredConditionsMetric, value);
    } else if (CoreMetrics.COVERED_CONDITIONS_BY_LINE.equals(metric)) {
      checkDataIsNotNull(data);
      itMeasure = new Measure(coveredConditionsByLineMetric, data);
    } else if (CoreMetrics.CONDITIONS_BY_LINE.equals(metric)) {
      checkDataIsNotNull(data);
      itMeasure = new Measure(conditionsByLineMetric, data);
    }
    return itMeasure;
  }
}
