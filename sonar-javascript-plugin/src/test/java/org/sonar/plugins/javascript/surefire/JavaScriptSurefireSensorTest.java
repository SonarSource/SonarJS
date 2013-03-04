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

import org.junit.Test;
import org.junit.Before;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TestUtils;

import java.io.File;

import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyDouble;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;


public class JavaScriptSurefireSensorTest {
  private JavaScriptSurefireSensor sensor;
  private SensorContext context;
  private Project project;

  @Before
  public void setUp() {
    project = TestUtils.mockProject();
    sensor = new JavaScriptSurefireSensor(new Settings(), TestUtils.mockJavaScriptLanguage());
    context = mock(SensorContext.class);
  }

  @Test
  public void shouldReportCorrectViolations() {
    Settings config = new Settings();
    config.setProperty(JavaScriptPlugin.UNIT_TESTS_REPORT_PATH_KEY, "surefire-reports/sample-unit.xml");
    sensor = new JavaScriptSurefireSensor(config, TestUtils.mockJavaScriptLanguage());
    sensor.analyse(project, context);

    verify(context, times(4)).saveMeasure((org.sonar.api.resources.File) anyObject(),
        eq(CoreMetrics.TESTS), anyDouble());
    verify(context, times(4)).saveMeasure((org.sonar.api.resources.File) anyObject(),
        eq(CoreMetrics.SKIPPED_TESTS), anyDouble());
    verify(context, times(4)).saveMeasure((org.sonar.api.resources.File) anyObject(),
        eq(CoreMetrics.TEST_ERRORS), anyDouble());
    verify(context, times(4)).saveMeasure((org.sonar.api.resources.File) anyObject(),
        eq(CoreMetrics.TEST_FAILURES), anyDouble());
    verify(context, times(4)).saveMeasure((org.sonar.api.resources.File) anyObject(),
        eq(CoreMetrics.TEST_SUCCESS_DENSITY), anyDouble());
    verify(context, times(4)).saveMeasure((org.sonar.api.resources.File) anyObject(), any(Measure.class));
  }

  @Test
  public void shouldReportZeroTestWhenNoReportFound() {
    Settings config = new Settings();
    config.setProperty(JavaScriptPlugin.UNIT_TESTS_REPORT_PATH_KEY, "notexistingpath");
    sensor = new JavaScriptSurefireSensor(config, TestUtils.mockJavaScriptLanguage());
    sensor.analyse(project, context);

    verify(context, times(1)).saveMeasure(eq(CoreMetrics.TESTS), eq(0.0));
  }

  @Test(expected = org.sonar.api.utils.SonarException.class)
  public void shouldThrowWhenGivenInvalidTime() {
    Settings config = new Settings();
    config.setProperty(JavaScriptPlugin.UNIT_TESTS_REPORT_PATH_KEY, "surefire-reports/invalid-surefire-report.xml");
    sensor = new JavaScriptSurefireSensor(config, TestUtils.mockJavaScriptLanguage());

    sensor.analyse(project, context);
  }


  File junitReport() {
    return new File(new File(project.getFileSystem().getBasedir().getPath(), "surefire-reports"),
        "sample-unit.xml");
  }
}
