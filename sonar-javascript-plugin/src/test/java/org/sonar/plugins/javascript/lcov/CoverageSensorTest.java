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

import com.google.common.collect.ImmutableList;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.measures.Metric;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;
import org.sonar.api.scan.filesystem.FileQuery;
import org.sonar.api.scan.filesystem.ModuleFileSystem;
import org.sonar.plugins.javascript.JavaScriptPlugin;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Mockito.*;

public class CoverageSensorTest {

  private static final File baseDir = new File("src/test/resources/org/sonar/plugins/javascript/unittest/jstestdriver/");

  private CoverageSensor sensor;
  private SensorContext context;
  private Settings settings;
  private ModuleFileSystem fileSystem = mock(ModuleFileSystem.class);
  private Project project;

  @Before
  public void init() {
    settings = new Settings();
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "jsTestDriver.conf-coverage.dat");
    sensor = new CoverageSensor(fileSystem, settings);
    context = mock(SensorContext.class);
    project = mockProject();
  }

  @Test
  public void test_should_execute() {
    // no JS files -> do not execute
    when(fileSystem.files(any(FileQuery.class))).thenReturn(new ArrayList<File>());
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    // at least one JS file -> do execute
    when(fileSystem.files(any(FileQuery.class))).thenReturn(Collections.singletonList(mock(File.class)));
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();

    // no path to report -> do execute
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "");
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void report_not_found() throws Exception {
    Project project = new Project("key");
    when(fileSystem.baseDir()).thenReturn((new File("bad/base/module/dir")));

    sensor.analyse(project, context);

    verifyZeroInteractions(context);
  }

  @Test
  public void testFileInJsTestDriverCoverageReport() {
    when(fileSystem.baseDir()).thenReturn((baseDir));
    when(fileSystem.files(any(FileQuery.class))).thenReturn(ImmutableList.of(
      new File(baseDir, "sensortests/main/Person.js"),
      new File(baseDir, "sensortests/main/Person.js"),
      new File(baseDir, "sensortests/test/PersonTest.js")));

    sensor.analyse(project, context);
    verify(context, atLeast(3)).saveMeasure((Resource) anyObject(), (Measure) anyObject());
  }

  @Test
  public void testFileNotInJsTestDriverCoverageReport() {
    File fileToCheck = new File(baseDir, "another.js");
    when(fileSystem.baseDir()).thenReturn((baseDir));
    when(fileSystem.files(any(FileQuery.class))).thenReturn(ImmutableList.of(
      fileToCheck,
      new File(baseDir, "sensortests/main/Person.js"),
      new File(baseDir, "sensortests/test/PersonTest.js")));

    when(context.getMeasure(org.sonar.api.resources.File.fromIOFile(fileToCheck, project), CoreMetrics.LINES)).thenReturn(
      new Measure(CoreMetrics.LINES, (double) 20));
    when(context.getMeasure(org.sonar.api.resources.File.fromIOFile(fileToCheck, project), CoreMetrics.NCLOC)).thenReturn(
      new Measure(CoreMetrics.LINES, (double) 22));

    sensor.analyse(project, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(22.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(22.0));
  }

  @Test
  public void testSaveZeroValueForAllFiles() throws Exception {
    when(fileSystem.baseDir()).thenReturn((baseDir));
    when(fileSystem.files(any(FileQuery.class))).thenReturn(ImmutableList.of(
      new File(baseDir, "sensortests/main/Person.js")));

    settings.setProperty(JavaScriptPlugin.FORCE_ZERO_COVERAGE_KEY, "true");
    settings.setProperty(JavaScriptPlugin.LCOV_REPORT_PATH, "");
    when(context.getMeasure(any(Resource.class), any(Metric.class))).thenReturn(new Measure().setValue(1d));
    sensor.analyse(project, context);

    verify(context, times(1)).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(1d));
    verify(context, times(1)).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(1d));
  }


  @Test
  public void test_toString() {
    assertThat(sensor.toString()).isEqualTo("CoverageSensor");
  }

  public static Project mockProject() {
    ProjectFileSystem pfs = mock(ProjectFileSystem.class);
    when(pfs.getSourceDirs()).thenReturn(ImmutableList.of(new File(baseDir, "main")));

    Project project = new Project("key");
    project.setFileSystem(pfs);

    return project;
  }
}
