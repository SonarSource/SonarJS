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

package org.sonar.plugins.javascript.surefire;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.commons.io.FileUtils;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.resources.File;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Qualifiers;
import org.sonar.api.utils.ParsingUtils;
import org.sonar.api.utils.StaxParser;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.core.JavaScriptReportsSensor;

public class JavaScriptSurefireSensor extends JavaScriptReportsSensor {

  private JavaScript lang = null;
  private Set<TestSuite> analyzedReports = new HashSet<TestSuite>();
  /**
   * {@inheritDoc}
   */
  public JavaScriptSurefireSensor(Settings conf, JavaScript javascript) {
    super(conf);
    this.lang = javascript;
  }
  
  @Override
  protected String reportPathKey() {
    return JavaScriptPlugin.UNIT_TESTS_REPORT_PATH_KEY;
  }
  
  @Override
  protected String defaultReportPath() {
	  return JavaScriptPlugin.UNIT_TESTS_DEFAULT_REPORT_PATH;
  }
  @Override
  protected void processReport(final Project project, final SensorContext context, java.io.File report)
      throws javax.xml.stream.XMLStreamException
  {
    parseReport(project, context, report);
  }
  
  @Override
  protected void handleNoReportsCase(SensorContext context) {
    context.saveMeasure(CoreMetrics.TESTS, 0.0);
  }

  private void parseReport(Project project, SensorContext context, java.io.File report)
      throws javax.xml.stream.XMLStreamException
  {
	LOG.info("Parsing report '{}'", report);
    
    TestSuiteParser parserHandler = new TestSuiteParser();
    StaxParser parser = new StaxParser(parserHandler, false);
    parser.parse(report);

    for (TestSuite fileReport : parserHandler.getParsedReports()) {
      if (analyzedReports.contains(fileReport)) {
    	  continue;
      }
      String fileKey = fileReport.getKey();

      org.sonar.api.resources.File unitTest = createSonarFile(project, context, fileKey);

      LOG.debug("Saving test execution measures for file '{}' under resource '{}'",
          fileKey, unitTest);

      double testsCount = fileReport.getTests() - fileReport.getSkipped();
      context.saveMeasure(unitTest, CoreMetrics.SKIPPED_TESTS, (double) fileReport.getSkipped());
      context.saveMeasure(unitTest, CoreMetrics.TESTS, testsCount);
      context.saveMeasure(unitTest, CoreMetrics.TEST_ERRORS, (double) fileReport.getErrors());
      context.saveMeasure(unitTest, CoreMetrics.TEST_FAILURES, (double) fileReport.getFailures());
      context.saveMeasure(unitTest, CoreMetrics.TEST_EXECUTION_TIME, (double) fileReport.getTime());
      double passedTests = testsCount - fileReport.getErrors() - fileReport.getFailures();
      if (testsCount > 0) {
        double percentage = passedTests * 100d / testsCount;
        context.saveMeasure(unitTest, CoreMetrics.TEST_SUCCESS_DENSITY, ParsingUtils.scaleValue(percentage));
      }
      LOG.debug("TestDetails: {}", fileReport.getDetails());
      context.saveMeasure(unitTest, new Measure(CoreMetrics.TEST_DATA, fileReport.getDetails()));
      analyzedReports.add(fileReport);
    }
  }
  
  private String getUnitTestFileName(String classKey) {
    return classKey.replaceAll("\\.", "/") + ".js";
  }
  
  protected java.io.File getUnitTestIOFile(List<java.io.File> testDirectories, String name) {
    java.io.File unitTestFile = new java.io.File("");
    for (java.io.File dir : testDirectories) {
      unitTestFile = new java.io.File(dir, name);
      if (unitTestFile.exists()) {
        break;
      }
    }
    return unitTestFile;
  }
  
  private File createSonarFile(Project project, SensorContext context, String fileKey) {
      java.io.File ioFile = getUnitTestIOFile(project.getFileSystem().getTestDirs(), getUnitTestFileName(fileKey)); 
      File unitTest = null;
      String source = "";
      if (ioFile.exists()) {
        unitTest = File.fromIOFile(ioFile, project.getFileSystem().getTestDirs());
        try {
          source = FileUtils.readFileToString(ioFile, project.getFileSystem().getSourceCharset().name());
        } catch (IOException e) {
          source = "Could not read source for unit test: " + fileKey;
          LOG.debug(source, e);
        }
      } else {
    	  unitTest = new File(this.lang, getUnitTestFileName(fileKey));
    	  source = "<source code could not be found>";
      }
      unitTest.setLanguage(JavaScript.INSTANCE);
      unitTest.setQualifier(Qualifiers.UNIT_TEST_FILE);
      context.saveSource(unitTest, source);
      return unitTest;
  }

}
