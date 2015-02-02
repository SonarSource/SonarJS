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
package org.sonar.plugins.javascript.unittest.jstest;

import com.google.common.collect.ImmutableList;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.Project;
import org.sonar.api.scan.filesystem.FileQuery;
import org.sonar.api.scan.filesystem.ModuleFileSystem;
import org.sonar.plugins.javascript.JavaScriptPlugin;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class JsTestSensorTest {

  private Settings settings;
  private JsTestSensor sensor;

  @Before
  public void setUp() {
    settings = new Settings();
    sensor = new JsTestSensor(mockFileSystem(), settings);
  }

  @Test
  public void test_shouldExecuteOnProject() {
    // Not a JavaScript project
    assertThat(sensor.shouldExecuteOnProject(mockProject("java"))).isFalse();

    // No report path provided
    assertThat(sensor.shouldExecuteOnProject(mockProject("js"))).isFalse();
    assertThat(mock_sensor_for_SQ_over_4_0().shouldExecuteOnProject(mockProject(""))).isFalse();

    settings.setProperty(JavaScriptPlugin.JSTEST_REPORTS_PATH, "jstest");
    assertThat(sensor.shouldExecuteOnProject(mockProject("js"))).isTrue();
    assertThat(mock_sensor_for_SQ_over_4_0().shouldExecuteOnProject(mockProject(""))).isTrue();
  }

  @Test
  public void test_toString() {
    assertThat(sensor.toString()).isEqualTo("JsTestSensor");
  }

  private Project mockProject(final String language) {
    return new Project("mock") {
      @Override
      public String getLanguageKey() {
        return language;
      }
    };
  }

  private ModuleFileSystem mockFileSystem() {
    ModuleFileSystem fs = mock(ModuleFileSystem.class);
    when(fs.files(any(FileQuery.class))).thenReturn(ImmutableList.of(new File("mock")));

    return fs;
  }

  private JsTestSensor mock_sensor_for_SQ_over_4_0() {
    ModuleFileSystem fs = mock(ModuleFileSystem.class);
    when(fs.files(any(FileQuery.class))).thenReturn(ImmutableList.of(new File("mock")));

    return new JsTestSensor(fs, settings);
  }

}

