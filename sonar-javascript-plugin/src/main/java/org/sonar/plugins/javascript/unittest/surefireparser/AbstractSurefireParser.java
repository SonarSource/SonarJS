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
package org.sonar.plugins.javascript.unittest.surefireparser;

import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.Metric;
import org.sonar.api.resources.Resource;
import org.sonar.api.utils.ParsingUtils;
import org.sonar.api.utils.SonarException;
import org.sonar.api.utils.StaxParser;

import javax.xml.stream.XMLStreamException;
import java.io.File;
import java.io.FilenameFilter;
import java.util.Map;

public abstract class AbstractSurefireParser {

  private static final Logger LOGGER = LoggerFactory.getLogger(AbstractSurefireParser.class);

  public void collect(SensorContext context, File reportsDir) {
    File[] xmlFiles = getReports(reportsDir);

    if (xmlFiles.length > 0) {
      parseFiles(context, xmlFiles);
    } else {
      LOGGER.warn("No Unit Test information will be saved, because no Unit Test report has been found in the given directory: {}" + reportsDir.getAbsolutePath());
    }
  }

  private File[] getReports(File dir) {
    if (dir == null) {
      return new File[0];
    } else if (!dir.isDirectory()) {
      LOGGER.warn("Reports path not found: " + dir.getAbsolutePath());
      return new File[0];
    }
    File[] unitTestResultFiles = findXMLFilesStartingWith(dir, "TEST-");
    if (unitTestResultFiles.length == 0) {
      // maybe there's only a test suite result file
      unitTestResultFiles = findXMLFilesStartingWith(dir, "TESTS-");
    }
    return unitTestResultFiles;
  }

  private File[] findXMLFilesStartingWith(File dir, final String fileNameStart) {
    return dir.listFiles(new FilenameFilter() {
      @Override
      public boolean accept(File dir, String name) {
        return name.startsWith(fileNameStart) && name.endsWith(".xml");
      }
    });
  }

  private void parseFiles(SensorContext context, File[] reports) {
    UnitTestIndex index = new UnitTestIndex();
    parseFiles(reports, index);
    sanitize(index);
    save(index, context);
  }

  private void parseFiles(File[] reports, UnitTestIndex index) {
    SurefireStaxHandler staxParser = new SurefireStaxHandler(index);
    StaxParser parser = new StaxParser(staxParser, false);
    for (File report : reports) {
      try {
        parser.parse(report);
      } catch (XMLStreamException e) {
        throw new SonarException("Fail to parse the Surefire report: " + report, e);
      }
    }
  }

  private void sanitize(UnitTestIndex index) {
    for (String classname : index.getClassnames()) {
      if (StringUtils.contains(classname, "$")) {
        // Surefire reports classes whereas sonar supports files
        String parentClassName = StringUtils.substringBefore(classname, "$");
        index.merge(classname, parentClassName);
      }
    }
  }

  private void save(UnitTestIndex index, SensorContext context) {
    for (Map.Entry<String, UnitTestClassReport> entry : index.getIndexByClassname().entrySet()) {
      UnitTestClassReport report = entry.getValue();

      if (report.getTests() > 0) {
        Resource resource = getUnitTestResource(entry.getKey());

        if (resource != null) {
          save(entry.getValue(), resource, context);
        } else {
          LOGGER.warn("Test result will not be saved for test class {}, because SonarQube associated resource not found.", entry.getKey());
        }
      }
    }
  }

  private void save(UnitTestClassReport report, Resource resource, SensorContext context) {
    double testsCount = report.getTests() - report.getSkipped();
    saveMeasure(context, resource, CoreMetrics.SKIPPED_TESTS, report.getSkipped());
    saveMeasure(context, resource, CoreMetrics.TESTS, testsCount);
    saveMeasure(context, resource, CoreMetrics.TEST_ERRORS, report.getErrors());
    saveMeasure(context, resource, CoreMetrics.TEST_FAILURES, report.getFailures());
    saveMeasure(context, resource, CoreMetrics.TEST_EXECUTION_TIME, report.getDurationMilliseconds());
    double passedTests = testsCount - report.getErrors() - report.getFailures();
    if (testsCount > 0) {
      double percentage = passedTests * 100d / testsCount;
      saveMeasure(context, resource, CoreMetrics.TEST_SUCCESS_DENSITY, ParsingUtils.scaleValue(percentage));
    }
    saveResults(context, resource, report);
  }

  private void saveMeasure(SensorContext context, Resource resource, Metric metric, double value) {
    if (!Double.isNaN(value)) {
      context.saveMeasure(resource, metric, value);
    }
  }

  protected void saveResults(SensorContext context, Resource resource, UnitTestClassReport report) {
    context.saveMeasure(resource, new Measure(CoreMetrics.TEST_DATA, report.toXml()));
  }

  protected abstract Resource getUnitTestResource(String classKey);

}
