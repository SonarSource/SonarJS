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
package org.sonar.plugins.javascript.jstest;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;

import static org.fest.assertions.Assertions.assertThat;

public class JsTestCoverageSensorTest {

  private JavaScript language;
  private Settings settings;
  private JsTestCoverageSensor sensor;

  @Before
  public void setUp() {
    settings = new Settings();
    language = new JavaScript(settings);
    sensor = new JsTestCoverageSensor(language);
  }

  @Test
  public void test_shouldExecuteOnProject() {
    Project project = mockProject();
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    project.setLanguage(language);
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    settings.setProperty(JavaScriptPlugin.TEST_FRAMEWORK_KEY, "jstest");
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void test_getTestReportsFolder() {
    assertThat(sensor.getTestReportsFolder()).isNull();
    settings.setProperty(JavaScriptPlugin.JSTEST_FOLDER_KEY, "folder");
    assertThat(sensor.getTestReportsFolder()).isEqualTo("folder");
  }

  @Test
  public void test_getTestCoverageFileName() {
    assertThat(sensor.getTestCoverageFileName()).isNull();
    settings.setProperty(JavaScriptPlugin.JSTEST_COVERAGE_FILE_KEY, "file");
    assertThat(sensor.getTestCoverageFileName()).isEqualTo("file");
  }

  @Test
  public void test_toString() {
    assertThat(sensor.toString()).isEqualTo("JsTestCoverageSensor");
  }

  private Project mockProject() {
    return new Project("mock");
  }

}
