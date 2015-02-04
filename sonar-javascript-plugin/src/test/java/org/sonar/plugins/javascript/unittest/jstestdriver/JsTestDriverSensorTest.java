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
package org.sonar.plugins.javascript.unittest.jstestdriver;

import static org.fest.assertions.Assertions.assertThat;
import static org.junit.Assert.assertEquals;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.io.File;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.test.TestUtils;

public class JsTestDriverSensorTest {

  private static final File PROJECT_BASE_DIR = TestUtils.getResource("org/sonar/plugins/javascript/unittest/jstestdriver/sensortests");

  private JsTestDriverSensor sensor;
  private SensorContext context;
  private Settings settings;
  private DefaultFileSystem fileSystem = new DefaultFileSystem();
  private final Project project = new Project("project");

  @Before
  public void init() {
    settings = new Settings();
    sensor = new JsTestDriverSensor(fileSystem, settings);
    context = mock(SensorContext.class);
  }

  @Test
  public void test_shouldExecuteOnProject() {
    // Not a JavaScript project
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    // No report path provided
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    settings.setProperty(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH, "jstestdriver");
    fileSystem.add(new DefaultInputFile("File.jsp").setLanguage(JavaScript.KEY).setType(InputFile.Type.MAIN));
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void testAnalyseUnitTests() {
    settings.setProperty(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH, "reports/jstestdriver");
    fileSystem.setBaseDir(PROJECT_BASE_DIR);
    fileSystem.add(newTestInputFile("PersonTest.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/test/PersonTest.js"));

    sensor.analyse(project, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TESTS), eq(2.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.SKIPPED_TESTS), eq(0.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_ERRORS), eq(0.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_FAILURES), eq(0.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_EXECUTION_TIME), eq(700.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_SUCCESS_DENSITY), eq(100.0));
  }

  @Test
  public void testGetUnitTestFileName() {
    assertEquals("com/company/PersonTest.js", sensor.getUnitTestFileName("Chrome_16091263_Windows.com.company.PersonTest"));
    assertEquals("PersonTest.js", sensor.getUnitTestFileName("Chrome_16091263_Windows.PersonTest"));
  }

  @Test
  public void test_toString() {
    assertThat(sensor.toString()).isEqualTo("JsTestDriverSensor");
  }

  public DefaultInputFile newTestInputFile(String name, String path) {
    return new DefaultInputFile(name)
      .setAbsolutePath(TestUtils.getResource(path).getAbsolutePath())
      .setType(InputFile.Type.TEST)
      .setLanguage(JavaScript.KEY);
  }

}
