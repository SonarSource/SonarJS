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

import static org.fest.assertions.Assertions.assertThat;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;

public class JsTestSensorTest {

  private final Project project = new Project("project");
  private Settings settings;
  private JsTestSensor sensor;
  private DefaultFileSystem fileSystem;

  @Before
  public void setUp() {
    settings = new Settings();
    fileSystem = new DefaultFileSystem();
    sensor = new JsTestSensor(fileSystem, settings);
  }

  @Test
  public void test_shouldExecuteOnProject() {
    // No JavaScipt files in fileSystem & no report
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    // No report path provided
    fileSystem.add(new DefaultInputFile("File.js").setLanguage(JavaScript.KEY).setType(InputFile.Type.MAIN));
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    settings.setProperty(JavaScriptPlugin.JSTEST_REPORTS_PATH, "jstest");
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void test_toString() {
    assertThat(sensor.toString()).isEqualTo("JsTestSensor");
  }

}

