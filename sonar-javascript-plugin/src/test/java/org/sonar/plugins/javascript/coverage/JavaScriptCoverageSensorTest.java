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

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.resources.File;
import org.sonar.api.resources.Project;
import org.sonar.api.utils.SonarException;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TestUtils;

import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class JavaScriptCoverageSensorTest {
  private SensorContext context;
  private Project project;
  
  /*
   * We have 4 source files in coverage report
   * 3 metrics are saved for line coverage
   * 4 metrics are saved for branch coverage
   * 4 source files * (3 line coverage + 4 branch coverage) = 28
   */
  private final static int MEASURE_SAVE_COUNT = 28;
  
  @Before
  public void setUp() {
    project = TestUtils.mockProject();
    context = getContextMock();
  }
  
  @Test(expected = org.sonar.api.utils.SonarException.class)
  public void shouldThrowWhenNoCoveragePluginIsSpecified() {
    new JavaScriptCoverageSensor(new Settings());
  }
  
  @Test(expected = org.sonar.api.utils.SonarException.class)
  public void shouldThrowWhenCoveragePluginValueIsNotAccepted() throws SonarException{
      Settings settings = new Settings();
      settings.appendProperty(JavaScriptPlugin.COVERAGE_PLUGIN_KEY, "asfas");
      new JavaScriptCoverageSensor(settings);
  }

  @Test
  public void shouldReportCorrectCoverage() {
    Settings settings = new Settings();
    settings.appendProperty(JavaScriptPlugin.COVERAGE_PLUGIN_KEY, "cobertura");
    settings.appendProperty(JavaScriptPlugin.COVERAGE_REPORT_PATH_KEY, "coverage-reports/cobertura-*.xml");
    settings.appendProperty(JavaScriptPlugin.COVERAGE_IT_REPORT_PATH_KEY, "coverage-reports/it-cobertura-*.xml");
    settings.appendProperty(JavaScriptPlugin.COVERAGE_OVERALL_REPORT_PATH_KEY, "coverage-reports/overall-cobertura-*.xml");
    JavaScriptCoverageSensor sensor = new JavaScriptCoverageSensor(settings);
    sensor.analyse(project, context);
    //We have 3 identical reports, thus MEASURE_SAVE_COUNT * 3
    verify(context, times(MEASURE_SAVE_COUNT*3)).saveMeasure((File) anyObject(), any(Measure.class));
  }
  
  @Test
  public void shouldReportSameCoverageRegardlessOfCoveragePlugin() {
    Settings settings = new Settings();
    settings.appendProperty(JavaScriptPlugin.COVERAGE_PLUGIN_KEY, "cobertura");
    settings.appendProperty(JavaScriptPlugin.COVERAGE_REPORT_PATH_KEY, "coverage-reports/cobertura-*.xml");
    JavaScriptCoverageSensor sensor = new JavaScriptCoverageSensor(settings);
    SensorContext context1 = getContextMock();
    sensor.analyse(project, context1);
    verify(context1, times(MEASURE_SAVE_COUNT)).saveMeasure((File) anyObject(), any(Measure.class));
    settings.setProperty(JavaScriptPlugin.COVERAGE_PLUGIN_KEY, "lcov");
    settings.setProperty(JavaScriptPlugin.COVERAGE_REPORT_PATH_KEY, "coverage-reports/lcov-*.dat");
    sensor = new JavaScriptCoverageSensor(settings);
    SensorContext context2 = getContextMock();
    sensor.analyse(project, context2);
    verify(context2, times(MEASURE_SAVE_COUNT)).saveMeasure((File) anyObject(), any(Measure.class));
  }

  @Test
  public void shouldReportNoCoverageSaved() {
    when(context.getResource((File) anyObject())).thenReturn(null);
    when(context.getMeasure(CoreMetrics.LINES)).thenReturn(new Measure(CoreMetrics.LINES, 20.0));
    when(context.getMeasure(CoreMetrics.NCLOC)).thenReturn(new Measure(CoreMetrics.NCLOC, 10.0));
    Settings settings = new Settings();
    settings.appendProperty(JavaScriptPlugin.COVERAGE_PLUGIN_KEY, "cobertura");
    settings.appendProperty(JavaScriptPlugin.COVERAGE_REPORT_PATH_KEY, "unexistingdir");
    JavaScriptCoverageSensor sensor = new JavaScriptCoverageSensor(settings);
    sensor.analyse(project, context);
    verify(context).saveMeasure(any(Measure.class));
    verify(context).saveMeasure(CoreMetrics.LINES_TO_COVER, 10.0);
    verify(context).saveMeasure(CoreMetrics.UNCOVERED_LINES, 10.0);
  }
  
  private SensorContext getContextMock() {
    SensorContext context = mock(SensorContext.class);
    File resourceMock = mock(File.class);
    when(context.getResource((File) anyObject())).thenReturn(resourceMock);
    return context;
  }
}
