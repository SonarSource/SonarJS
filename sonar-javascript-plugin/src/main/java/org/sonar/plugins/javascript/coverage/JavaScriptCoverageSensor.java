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

package org.sonar.plugins.javascript.coverage;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import javax.xml.stream.XMLStreamException;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.Metric;
import org.sonar.api.measures.PropertiesBuilder;
import org.sonar.api.resources.Project;
import org.sonar.api.utils.SonarException;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScriptReportsSensor;


public class JavaScriptCoverageSensor extends JavaScriptReportsSensor {
  private static final int UNIT_TEST_COVERAGE = 0;
  public static final int IT_TEST_COVERAGE = 1;
  public static final int OVERALL_TEST_COVERAGE = 2;
   
  private static final String COBERTURA_COVERAGE_KEY = "cobertura";
  private static final String LCOV_COVERAGE_KEY = "lcov";
  
  private static final String COVERAGE_PLUGIN_MISSING_EXCEPTION_MESSAGE = "coveragePlugin option is mandatory and accepts one of the available values: lcov, cobertura";
  
  private final Settings settings;
  private CoverageParser parser;
  
  public JavaScriptCoverageSensor(Settings settings) {
    this.settings = settings;
    if (settings.getString(JavaScriptPlugin.COVERAGE_PLUGIN_KEY) == null) {
      throw new SonarException(COVERAGE_PLUGIN_MISSING_EXCEPTION_MESSAGE);
    } else if (settings.getString(JavaScriptPlugin.COVERAGE_PLUGIN_KEY).equals(COBERTURA_COVERAGE_KEY)) {
      parser = new CoberturaParser();
    } else if (settings.getString(JavaScriptPlugin.COVERAGE_PLUGIN_KEY).equals(LCOV_COVERAGE_KEY)) {
      parser = new LCOVParser();
    } else {
    	throw new SonarException(COVERAGE_PLUGIN_MISSING_EXCEPTION_MESSAGE);
    }
  }
  
  /**
   * {@inheritDoc}
   */
  @Override
  public void analyse(Project project, SensorContext context) {
    List<File> reports = getReports(settings, project.getFileSystem().getBasedir().getPath(),
    			JavaScriptPlugin.COVERAGE_REPORT_PATH_KEY, JavaScriptPlugin.COVERAGE_DEFAULT_REPORT_PATH);
    if (reports.size() == 0) {
      handleNoReportsCase(context);
    } else {
      LOG.debug("Parsing coverage reports");
      List<JavaScriptFileCoverage> coverageMeasures = parseReports(reports);
      saveMeasures(project, context, coverageMeasures, UNIT_TEST_COVERAGE);      
    }

	
    LOG.debug("Parsing integration test coverage reports");
    List<File> itReports = getReports(settings, project.getFileSystem().getBasedir().getPath(),
    		JavaScriptPlugin.COVERAGE_IT_REPORT_PATH_KEY, JavaScriptPlugin.COVERAGE_IT_DEFAULT_REPORT_PATH);
    List<JavaScriptFileCoverage> itCoverageMeasures = parseReports(itReports);
    saveMeasures(project, context, itCoverageMeasures, IT_TEST_COVERAGE);

    LOG.debug("Parsing overall test coverage reports");
    List<File> overallReports = getReports(settings, project.getFileSystem().getBasedir().getPath(),
    		JavaScriptPlugin.COVERAGE_OVERALL_REPORT_PATH_KEY, JavaScriptPlugin.COVERAGE_OVERALL_DEFAULT_REPORT_PATH);
    List<JavaScriptFileCoverage> overallCoverageMeasures = parseReports(overallReports);
    saveMeasures(project, context, overallCoverageMeasures, OVERALL_TEST_COVERAGE);
  }
  
  @Override
  protected void handleNoReportsCase(SensorContext sensorContext) {
    
    PropertiesBuilder<Integer, Integer> lineHitsData = new PropertiesBuilder<Integer, Integer>(CoreMetrics.COVERAGE_LINE_HITS_DATA);
    for (int x = 1; x < sensorContext.getMeasure(CoreMetrics.LINES).getIntValue(); x++) {
      lineHitsData.add(x, 0);
    }
    
    // use non comment lines of code for coverage calculation
    Measure ncloc = sensorContext.getMeasure(CoreMetrics.NCLOC);
    sensorContext.saveMeasure(lineHitsData.build());
    sensorContext.saveMeasure(CoreMetrics.LINES_TO_COVER, ncloc.getValue());
    sensorContext.saveMeasure(CoreMetrics.UNCOVERED_LINES, ncloc.getValue());
  }

  private List<JavaScriptFileCoverage> parseReports(List<File> reports) {
	    List<JavaScriptFileCoverage>  measuresTotal = new ArrayList<JavaScriptFileCoverage>();
	    List<JavaScriptFileCoverage>  measuresForReport;
	    
    for (File report : reports) {
      boolean parsed = false;
      
      try{
        measuresForReport = parser.parseFile(report);
        
        if (!measuresForReport.isEmpty()) {
          parsed = true;
          measuresTotal.addAll(measuresForReport);
          LOG.info("Added report '{}' (parsed by: {}) to the coverage data", report, parser);
          break;            
        }
      } catch (XMLStreamException e) {
        LOG.trace("Report {} cannot be parsed by {}", report, parser);
      }
      
      if(!parsed){
        LOG.error("Report {} cannot be parsed", report);
      }
    }
    
    return measuresTotal;
  }

  private void saveMeasures(Project project, SensorContext context, List<JavaScriptFileCoverage> coverageMeasures, int coveragetype) {
    for (JavaScriptFileCoverage entry : coverageMeasures) {
      String filePath = entry.getFilePath();
      org.sonar.api.resources.File resource =
        org.sonar.api.resources.File.fromIOFile(new File(filePath), project);
      if (fileExist(context, resource)) {
        LOG.debug("Saving coverage measures for file '{}'", filePath);
        
        for (Measure measure : entry.getCoverageMeasures()) {
          switch (coveragetype) {
            case UNIT_TEST_COVERAGE:
              break;
            case IT_TEST_COVERAGE:
              measure = convertToItMeasure(measure);
              break;
            case OVERALL_TEST_COVERAGE:
              measure = convertForOverall(measure);
              break;
            default:
              break;
          }
          context.saveMeasure(resource, measure);
        }
      } else {
        LOG.debug("Cannot find the file '{}', ignoring coverage measures", filePath);
      }
    }
  }
    
  private Measure convertToItMeasure(Measure measure){
    Measure itMeasure = null;
    Metric metric = measure.getMetric();
    Double value = measure.getValue();
    
    if (CoreMetrics.LINES_TO_COVER.equals(metric)) {
      itMeasure = new Measure(CoreMetrics.IT_LINES_TO_COVER, value);
    } else if (CoreMetrics.UNCOVERED_LINES.equals(metric)) {
      itMeasure = new Measure(CoreMetrics.IT_UNCOVERED_LINES, value);
    } else if (CoreMetrics.COVERAGE_LINE_HITS_DATA.equals(metric)) {
      itMeasure = new Measure(CoreMetrics.IT_COVERAGE_LINE_HITS_DATA, measure.getData());
    } else if (CoreMetrics.CONDITIONS_TO_COVER.equals(metric)) {
      itMeasure = new Measure(CoreMetrics.IT_CONDITIONS_TO_COVER, value);
    } else if (CoreMetrics.UNCOVERED_CONDITIONS.equals(metric)) {
      itMeasure = new Measure(CoreMetrics.IT_UNCOVERED_CONDITIONS, value);
    } else if (CoreMetrics.COVERED_CONDITIONS_BY_LINE.equals(metric)) {
      itMeasure = new Measure(CoreMetrics.IT_COVERED_CONDITIONS_BY_LINE, measure.getData());
    } else if (CoreMetrics.CONDITIONS_BY_LINE.equals(metric)) {
      itMeasure = new Measure(CoreMetrics.IT_CONDITIONS_BY_LINE, measure.getData());
    }

    return itMeasure;
  }

  private Measure convertForOverall(Measure measure) {
    Measure overallMeasure = null;

    if (CoreMetrics.LINES_TO_COVER.equals(measure.getMetric())) {
      overallMeasure = new Measure(CoreMetrics.OVERALL_LINES_TO_COVER, measure.getValue());
    } else if (CoreMetrics.UNCOVERED_LINES.equals(measure.getMetric())) {
      overallMeasure = new Measure(CoreMetrics.OVERALL_UNCOVERED_LINES, measure.getValue());
    } else if (CoreMetrics.COVERAGE_LINE_HITS_DATA.equals(measure.getMetric())) {
      overallMeasure = new Measure(CoreMetrics.OVERALL_COVERAGE_LINE_HITS_DATA, measure.getData());
    } else if (CoreMetrics.CONDITIONS_TO_COVER.equals(measure.getMetric())) {
      overallMeasure = new Measure(CoreMetrics.OVERALL_CONDITIONS_TO_COVER, measure.getValue());
    } else if (CoreMetrics.UNCOVERED_CONDITIONS.equals(measure.getMetric())) {
      overallMeasure = new Measure(CoreMetrics.OVERALL_UNCOVERED_CONDITIONS, measure.getValue());
    } else if (CoreMetrics.COVERED_CONDITIONS_BY_LINE.equals(measure.getMetric())) {
      overallMeasure = new Measure(CoreMetrics.OVERALL_COVERED_CONDITIONS_BY_LINE, measure.getData());
    } else if (CoreMetrics.CONDITIONS_BY_LINE.equals(measure.getMetric())) {
      overallMeasure = new Measure(CoreMetrics.OVERALL_CONDITIONS_BY_LINE, measure.getData());
    }

    return overallMeasure;
  }
  
  private boolean fileExist(SensorContext context, org.sonar.api.resources.File file) {
    return context.getResource(file) != null;
  }
  
  
}
