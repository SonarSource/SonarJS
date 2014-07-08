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
package org.sonar.plugins.javascript;

import com.google.common.collect.ImmutableList;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.component.ResourcePerspectives;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.FileLinesContext;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;
import org.sonar.api.scan.filesystem.FileQuery;
import org.sonar.api.scan.filesystem.ModuleFileSystem;

import java.io.File;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.Collections;

import static org.fest.assertions.Assertions.assertThat;
import static org.mockito.Matchers.any;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class JavaScriptSquidSensorTest {

  private FileLinesContextFactory fileLinesContextFactory;
  private Project project;

  @Before
  public void setUp() {
    fileLinesContextFactory = mock(FileLinesContextFactory.class);
    FileLinesContext fileLinesContext = mock(FileLinesContext.class);
    when(fileLinesContextFactory.createFor(any(Resource.class))).thenReturn(fileLinesContext);

    project = new Project("key");
    ProjectFileSystem pfs = mock(ProjectFileSystem.class);
    when(pfs.getSourceDirs()).thenReturn(Arrays.asList(new File("src/test/resources/cpd/")));

    project.setFileSystem(pfs);
  }

  @Test
  public void should_execute_if_js_files() {
    ModuleFileSystem fs = mock(ModuleFileSystem.class);
    project = new Project("key");

    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(mock(RulesProfile.class), fileLinesContextFactory, mock(ResourcePerspectives.class), fs);

    // no JS files -> do not execute
    when(fs.files(any(FileQuery.class))).thenReturn(Collections.<File>emptyList());
    assertThat(sensor.shouldExecuteOnProject(project)).isFalse();

    // at least one JS file -> do execute
    when(fs.files(any(FileQuery.class))).thenReturn(Arrays.asList(mock(File.class)));
    assertThat(sensor.shouldExecuteOnProject(project)).isTrue();
  }

  @Test
  public void should_analyse() {
    ModuleFileSystem fs = mock(ModuleFileSystem.class);
    when(fs.sourceCharset()).thenReturn(Charset.forName("UTF-8"));
    ImmutableList<File> files = ImmutableList.of(new File("src/test/resources/cpd/Person.js"));
    when(fs.files(any(FileQuery.class))).thenReturn(files);


    SensorContext context = mock(SensorContext.class);
    JavaScriptSquidSensor sensor = new JavaScriptSquidSensor(mock(RulesProfile.class), fileLinesContextFactory, mock(ResourcePerspectives.class), fs);

    sensor.analyse(project, context);

    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.FILES), eq(1.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.LINES), eq(22.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.NCLOC), eq(10.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.FUNCTIONS), eq(2.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.STATEMENTS), eq(6.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.COMPLEXITY), eq(3.0));
    verify(context).saveMeasure(any(Resource.class), eq(CoreMetrics.COMMENT_LINES), eq(2.0));
  }

}
