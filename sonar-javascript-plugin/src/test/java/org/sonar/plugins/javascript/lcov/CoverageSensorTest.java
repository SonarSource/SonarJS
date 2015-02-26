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
package org.sonar.plugins.javascript.lcov;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultFileSystem;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.Metric;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.test.TestUtils;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.*;

public class CoverageSensorTest {

  private SensorContext context;
  private Settings settings;
  private Project project;

  @Before
  public void init() {
    settings = new Settings();
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "jsTestDriver.conf-coverage.dat");
    context = mock(SensorContext.class);
    project = new Project("project");

  }

  @Test
  public void test_should_execute() {
    DefaultFileSystem fs = new DefaultFileSystem();
    Settings localSettings = new Settings();
    localSettings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "jsTestDriver.conf-coverage.dat");
    CoverageSensor localSensor = newSensor(fs, localSettings);

    // no JS files -> do not execute
    assertThat(localSensor.shouldExecuteOnProject(project)).isFalse();

    // at least one JS file -> do execute
    fs.add(new DefaultInputFile("file.js").setType(InputFile.Type.MAIN).setLanguage(JavaScript.KEY));
    assertThat(localSensor.shouldExecuteOnProject(project)).isTrue();

    // no path to report -> do execute
    localSettings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "");
    assertThat(localSensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void report_not_found() throws Exception {
    DefaultFileSystem fs = newFileSystem();

    // Setting with bad report path
    Settings localSettings = new Settings();
    localSettings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "/fake/path/jsTestDriver.conf-coverage.dat");

    newSensor(fs, localSettings).analyse(project, context);

    verifyZeroInteractions(context);
  }

  @Test
  public void test_file_in_coverage_report() {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("sensortests/main/Another.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/main/Another.js"));
    fs.add(newSourceInputFile("sensortests/main/Person.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/main/Person.js"));
    newSensor(fs, settings).analyse(project, context);

    verify(context, atLeast(3)).saveMeasure(any(Resource.class), (Measure) anyObject());
  }

  @Test
  public void test_file_not_in_coverage_report() {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("sensortests/main/Another.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/main/Another.js"));

    when(context.getMeasure(any(org.sonar.api.resources.File.class), eq(CoreMetrics.LINES))).thenReturn(
      new Measure(CoreMetrics.LINES, (double) 20));
    when(context.getMeasure(any(org.sonar.api.resources.File.class), eq(CoreMetrics.NCLOC)))
      .thenReturn(
        new Measure(CoreMetrics.LINES, (double) 22));

    newSensor(fs, settings).analyse(project, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(22.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(22.0));
  }

  @Test
  public void test_save_zero_value_for_all_files() throws Exception {
    DefaultFileSystem fs = newFileSystem();
    fs.add(newSourceInputFile("sensortests/main/Person.js", "org/sonar/plugins/javascript/unittest/jstestdriver/sensortests/main/Person.js"));

    settings.setProperty(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY, "true");
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "");
    when(context.getMeasure(any(Resource.class), any(Metric.class))).thenReturn(new Measure().setValue(1d));

    newSensor(fs, settings).analyse(project, context);

    verify(context, times(1)).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(1d));
    verify(context, times(1)).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(1d));
  }

  @Test
  public void test_toString() {
    assertThat(newSensor(newFileSystem(), settings).toString()).isEqualTo("CoverageSensor");
  }

  public DefaultInputFile newSourceInputFile(String relativePath, String path) {
    return new DefaultInputFile(relativePath)
      .setAbsolutePath(TestUtils.getResource(path).getAbsolutePath())
      .setType(InputFile.Type.MAIN)
      .setLanguage(JavaScript.KEY);
  }

  public DefaultFileSystem newFileSystem() {
    DefaultFileSystem fs = new DefaultFileSystem();
    fs.setBaseDir(TestUtils.getResource("org/sonar/plugins/javascript/unittest/jstestdriver/"));

    return fs;
  }

  public CoverageSensor newSensor(DefaultFileSystem fs, Settings settings) {
    return new CoverageSensor(fs, settings);
  }

}
