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

import com.google.common.collect.ImmutableList;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.api.scan.filesystem.FileQuery;
import org.sonar.api.scan.filesystem.ModuleFileSystem;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.test.TestUtils;

import java.io.File;
import java.nio.charset.Charset;
import java.util.Arrays;

import static org.fest.assertions.Assertions.assertThat;
import static org.junit.Assert.assertEquals;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class JsTestDriverSensorTest {

  private JsTestDriverSensor sensor;
  private SensorContext context;
  private JavaScript language;
  private Settings settings;
  private ModuleFileSystem fileSystem = mock(ModuleFileSystem.class);

  @Before
  public void init() {
    settings = new Settings();
    language = new JavaScript(settings);
    sensor = new JsTestDriverSensor(language, fileSystem);
    context = mock(SensorContext.class);
  }

  @Test
  public void test_shouldExecuteOnProject() {
    // Not a JavaScript project
    assertThat(sensor.shouldExecuteOnProject(mockProject("java"))).isFalse();

    // No report path provided
    assertThat(sensor.shouldExecuteOnProject(mockProject("js"))).isFalse();
    assertThat(mock_sensor_for_SQ_over_4_0().shouldExecuteOnProject(mockProject(""))).isFalse();

    settings.setProperty(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH, "jstestdriver");
    assertThat(sensor.shouldExecuteOnProject(mockProject("js"))).isTrue();
    assertThat(mock_sensor_for_SQ_over_4_0().shouldExecuteOnProject(mockProject(""))).isTrue();
  }

  @Test
  public void testAnalyseUnitTests() {
    settings.setProperty(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH, "reports/jstestdriver");

    when(fileSystem.sourceCharset()).thenReturn(Charset.defaultCharset());

    File baseDir = TestUtils.getResource("org/sonar/plugins/javascript/unittest/jstestdriver/sensortests");
    when(fileSystem.baseDir()).thenReturn(baseDir);
    when(fileSystem.testDirs()).thenReturn(Arrays.asList(new File(baseDir, "test")));

    Project project = mockProject("js");

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

  private Project mockProject(final String language) {
    return new Project("mock") {
      @Override
      public String getLanguageKey() {
        return language;
      }
    };
  }

  private JsTestDriverSensor mock_sensor_for_SQ_over_4_0() {
    ModuleFileSystem fs = mock(ModuleFileSystem.class);
    when(fs.files(any(FileQuery.class))).thenReturn(ImmutableList.of(new File("mock")));

    return new JsTestDriverSensor(language, fs);
  }

}
