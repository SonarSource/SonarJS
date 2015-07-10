/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011 SonarSource and Eriks Nukis
 * sonarqube@googlegroups.com
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
import static org.junit.Assert.assertNotNull;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyDouble;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Metric;
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
    initFilesystem();
    when(context.getResource(any(InputFile.class))).thenReturn(org.sonar.api.resources.File.create("PersonTest.js"));

    sensor.analyse(project, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TESTS), eq(2.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.SKIPPED_TESTS), eq(0.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_ERRORS), eq(0.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_FAILURES), eq(0.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_EXECUTION_TIME), eq(700.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.TEST_SUCCESS_DENSITY), eq(100.0));
  }

  @Test
  public void wrong_file_name_in_report() {
    settings.setProperty(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH, "reports/wrong-jstestdriver-report");
    initFilesystem();

    sensor.analyse(project, context);

    verify(context, never()).saveMeasure(any(Resource.class), any(Metric.class), anyDouble());
  }

  @Test
  public void testGetUnitTestFileName() {
    String fileSeparator = File.separator;

    assertEquals("com" + fileSeparator + "company" + fileSeparator + "PersonTest.js", sensor.getUnitTestFileName("Chrome_16091263_Windows.com.company.PersonTest"));
    assertEquals("PersonTest.js", sensor.getUnitTestFileName("Chrome_16091263_Windows.PersonTest"));
  }

  @Test
  public void get_testfile_with_common_suffix_filename() {
    initFilesystem();

    InputFile inputFile1 = sensor.getTestFileRelativePathToBaseDir("PersonTest.js");
    assertNotNull(inputFile1);
    assertEquals("PersonTest.js", inputFile1.relativePath());
  }

  @Test
  public void get_testfile_with_directory() {
    initFilesystem();

    InputFile inputFile1 = sensor.getTestFileRelativePathToBaseDir("AnotherPersonTest.js");
    assertNotNull(inputFile1);
    assertEquals("AnotherPersonTest.js", inputFile1.relativePath());

    InputFile inputFile2 = sensor.getTestFileRelativePathToBaseDir("awesome/AnotherPersonTest.js");
    assertNotNull(inputFile2);
    assertEquals("awesome/AnotherPersonTest.js", inputFile2.relativePath());
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

  private void initFilesystem() {
    fileSystem.setBaseDir(PROJECT_BASE_DIR);
    fileSystem.add(newTestInputFile("awesome/AnotherPersonTest.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/test/awesome/AnotherPersonTest.js"));
    fileSystem.add(newTestInputFile("AnotherPersonTest.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/test/AnotherPersonTest.js"));
    fileSystem.add(newTestInputFile("PersonTest.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/test/PersonTest.js"));
  }

}
