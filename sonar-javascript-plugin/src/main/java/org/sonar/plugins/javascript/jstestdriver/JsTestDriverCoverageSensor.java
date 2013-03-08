/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.plugins.javascript.jstestdriver;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.CoverageMeasuresBuilder;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.PropertiesBuilder;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.coverage.LCOVParser;

import java.io.File;
import java.util.Map;

public class JsTestDriverCoverageSensor implements Sensor {

  protected JavaScript javascript;

  public JsTestDriverCoverageSensor(JavaScript javascript) {
    this.javascript = javascript;
  }

  private static final Logger LOG = LoggerFactory.getLogger(JsTestDriverCoverageSensor.class);

  public boolean shouldExecuteOnProject(Project project) {
    return javascript.equals(project.getLanguage())
      && "jstestdriver".equals(javascript.getSettings().getString(JavaScriptPlugin.TEST_FRAMEWORK_KEY));
  }

  public void analyse(Project project, SensorContext sensorContext) {
    File jsTestDriverCoverageReportFile = new File(project.getFileSystem().getBasedir(), getTestReportsFolder() + "/" + getTestCoverageFileName());
    LCOVParser parser = new LCOVParser();
    Map<String, CoverageMeasuresBuilder> coveredFiles = parser.parseFile(jsTestDriverCoverageReportFile);
    analyseCoveredFiles(project, sensorContext, coveredFiles);
  }

  protected void analyseCoveredFiles(Project project, SensorContext sensorContext, Map<String, CoverageMeasuresBuilder> coveredFiles) {

    for (InputFile inputFile : project.getFileSystem().mainFiles(JavaScript.KEY)) {
      try {
        CoverageMeasuresBuilder fileCoverage = getFileCoverage(inputFile, coveredFiles);
        org.sonar.api.resources.File resource = org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project);
        PropertiesBuilder<Integer, Integer> lineHitsData = new PropertiesBuilder<Integer, Integer>(CoreMetrics.COVERAGE_LINE_HITS_DATA);

        if (fileCoverage != null) {
          for (Measure measure : fileCoverage.createMeasures()) {
            sensorContext.saveMeasure(resource, measure);
          }
        } else {

          // colour all lines as not executed
          for (int x = 1; x < sensorContext.getMeasure(resource, CoreMetrics.LINES).getIntValue(); x++) {
            lineHitsData.add(x, 0);
          }

          // use non comment lines of code for coverage calculation
          Measure ncloc = sensorContext.getMeasure(resource, CoreMetrics.NCLOC);
          sensorContext.saveMeasure(resource, lineHitsData.build());
          sensorContext.saveMeasure(resource, CoreMetrics.LINES_TO_COVER, ncloc.getValue());
          sensorContext.saveMeasure(resource, CoreMetrics.UNCOVERED_LINES, ncloc.getValue());
        }

      } catch (Exception e) {
        LOG.error("Problem while calculating coverage for " + inputFile.getFileBaseDir() + inputFile.getRelativePath(), e);
      }
    }
  }

  protected CoverageMeasuresBuilder getFileCoverage(InputFile input, Map<String, CoverageMeasuresBuilder> coveredFiles) {
    CoverageMeasuresBuilder result = coveredFiles.get(input.getRelativePath());
    if (result == null) {
      result = coveredFiles.get(input.getFile().getAbsolutePath());
    }
    return result;
  }

  protected String getTestReportsFolder() {
    return javascript.getSettings().getString(JavaScriptPlugin.JSTESTDRIVER_FOLDER_KEY);
  }

  protected String getTestCoverageFileName() {
    return javascript.getSettings().getString(JavaScriptPlugin.JSTESTDRIVER_COVERAGE_FILE_KEY);
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

}
