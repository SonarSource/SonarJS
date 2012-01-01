/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
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

package org.sonar.plugins.javascript.jstestdriver;

import static org.junit.Assert.assertTrue;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.apache.commons.configuration.Configuration;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Measure;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.InputFileUtils;
import org.sonar.api.resources.Language;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;

public class JsTestDriverCoverageSensorTest {

  private JsTestDriverCoverageSensor sensor;
  SensorContext context;
  private Configuration configuration;

  @Before
  public void init() {
    configuration = mock(Configuration.class);
    when(configuration.getString(JavaScriptPlugin.JSTESTDRIVER_FOLDER_KEY, "jstestdriver")).thenReturn("jstestdriver");

    sensor = new JsTestDriverCoverageSensor(new JavaScript(configuration));
    context = mock(SensorContext.class);
  }

  @Test
  public void testFileInJsTestDriverCoverageReport() throws URISyntaxException {
    File fileToAnalyse = new File(getClass().getResource("/org/sonar/plugins/javascript/jstestdriver/sensortests/main/Person.js").toURI());
    File baseDir = new File(getClass().getResource("/org/sonar/plugins/javascript/jstestdriver/sensortests/main").toURI());

    InputFile inputFile = InputFileUtils.create(baseDir, fileToAnalyse);

    Project project = getProject(inputFile);
    assertTrue(sensor.shouldExecuteOnProject(project));

    List<JsTestDriverFileCoverage> coveredFiles = getCoveredFile(inputFile.getFile().getAbsolutePath());
    sensor.analyseCoveredFiles(project, context, coveredFiles);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(6.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(3.0));

  }

  @Test
  public void testFileNotInJsTestDriverCoverageReport() throws URISyntaxException {
    File fileToAnalyse = new File(getClass().getResource("/org/sonar/plugins/javascript/jstestdriver/sensortests/main/Person.js").toURI());
    File baseDir = new File(getClass().getResource("/org/sonar/plugins/javascript/jstestdriver/sensortests/main").toURI());

    InputFile inputFile = InputFileUtils.create(baseDir, fileToAnalyse);

    Project project = getProject(inputFile);
    assertTrue(sensor.shouldExecuteOnProject(project));

    when(context.getMeasure(org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project), CoreMetrics.LINES)).thenReturn(
        new Measure(CoreMetrics.LINES, (double) 20));
    when(context.getMeasure(org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project), CoreMetrics.NCLOC)).thenReturn(
        new Measure(CoreMetrics.LINES, (double) 22));

    List<JsTestDriverFileCoverage> coveredFiles = getCoveredFile(inputFile.getFile().getAbsolutePath() + "not_existing_file");
    sensor.analyseCoveredFiles(project, context, coveredFiles);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES_TO_COVER), eq(22.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.UNCOVERED_LINES), eq(22.0));

  }

  private Project getProject(InputFile inputFile) throws URISyntaxException {
    final ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());

    final File folder = new File(getClass().getResource("/org/sonar/plugins/javascript/jstestdriver/sensortests/target").toURI());
    when(fileSystem.getBuildDir()).thenReturn(folder);

    ArrayList<InputFile> inputFiles = new ArrayList<InputFile>();
    inputFiles.add(inputFile);
    when(fileSystem.mainFiles(JavaScript.KEY)).thenReturn(inputFiles);

    Project project = new Project("dummy") {

      public ProjectFileSystem getFileSystem() {
        return fileSystem;
      }

      public Language getLanguage() {
        return new JavaScript(configuration);
      }
    };

    return project;

  }

  private List<JsTestDriverFileCoverage> getCoveredFile(String fullPath) {
    List<JsTestDriverFileCoverage> list = new LinkedList<JsTestDriverFileCoverage>();

    JsTestDriverFileCoverage file = new JsTestDriverFileCoverage();
    Map<Integer, Integer> lineCoverage = new HashMap<Integer, Integer>();
    lineCoverage.put(1, 0);
    lineCoverage.put(2, 0);
    lineCoverage.put(3, 0);
    lineCoverage.put(4, 1);
    lineCoverage.put(5, 2);
    lineCoverage.put(6, 1);

    file.setLineCoverage(lineCoverage);
    file.setFullFileName(fullPath);

    list.add(file);
    return list;
  }
}
