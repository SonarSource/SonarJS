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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import javax.xml.stream.XMLStreamException;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.CoverageMeasuresBuilder;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.Metric;

public class CoberturaParserTest {


  private CoberturaParser parser = new CoberturaParser();
  private List<JavaScriptFileCoverage> list;
  @Before
  public void init() throws URISyntaxException, XMLStreamException {
    URL uri = getClass().getResource("/org/sonar/plugins/javascript/coverage-reports/cobertura-coverage.xml");
    File coverageReport = new File(uri.toURI());
    list = parser.parseFile(coverageReport);
  }

  @Test
  public void testIfAllSourceFilesAreCaptured() {
    assertEquals(4, list.size());
  }
  
  @Test
  public void testIfSourceFileNameIsCaptureCorrectly() {
    // verify first file
    JavaScriptFileCoverage fileCoverage = list.get(3);
    assertEquals("sources/Person.js", fileCoverage.getFilePath());
  }
  
  @Test
  public void testIfAllMeasuresPresentInReportAreCaptured() {
    JavaScriptFileCoverage fileCoverage = list.get(3);
    Collection<Measure> measures = fileCoverage.getCoverageMeasures();
    List<Metric> metrics = new ArrayList<Metric>();
    metrics.add(CoreMetrics.LINES_TO_COVER);
    metrics.add(CoreMetrics.UNCOVERED_LINES);
    metrics.add(CoreMetrics.COVERAGE_LINE_HITS_DATA);
    metrics.add(CoreMetrics.CONDITIONS_TO_COVER);
    metrics.add(CoreMetrics.UNCOVERED_CONDITIONS);
    metrics.add(CoreMetrics.CONDITIONS_BY_LINE);
    metrics.add(CoreMetrics.COVERED_CONDITIONS_BY_LINE);
  
    for(Measure measure: measures) {
      assertTrue(metrics.contains(measure.getMetric()));
    }
  }
  
  @Test
  public void testIfLineCoverageIsComputedCorrectly() {
    JavaScriptFileCoverage fileCoverage = list.get(3);
    fileCoverage.getCoverageMeasures();
    assertEquals(6, fileCoverage.getCoverageData().getLinesToCover());
    assertEquals(6, fileCoverage.getCoverageData().getCoveredLines());   
  }
  
  @Test
  public void testIfTotalNumberOfConditionsIsCapturedCorrectly() {
    JavaScriptFileCoverage fileCoverage = list.get(0);
    fileCoverage.getCoverageMeasures();
    assertEquals(3, fileCoverage.getCoverageData().getCoveredConditions());
  }
  
  @Test
  public void testIfPerLineConditionCountIsCapturedCorrectly() {
    JavaScriptFileCoverage fileCoverage = list.get(0);
    CoverageMeasuresBuilder data = fileCoverage.getCoverageData();
    assertEquals(2, data.getConditionsByLine().get(16).intValue());
    assertEquals(1, data.getCoveredConditionsByLine().get(16).intValue());
  }

  @Test
  public void testIfThrowsXMLExceptionWhenReportIsIsInvalid() throws URISyntaxException {
    URL invalidReportUri = getClass().getResource("/org/sonar/plugins/javascript/coverage-reports/invalid-cobertura-coverage.xml");
    File coverageReport = new File(invalidReportUri.toURI());
    try {
      list = parser.parseFile(coverageReport);
    } catch(Exception ex) {
      assertTrue(ex instanceof XMLStreamException);
    }

  }

}
