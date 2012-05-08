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

package org.sonar.plugins.javascript.squid;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.Charset;

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.Language;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.core.JavaScript;

public class JavaScriptSquidSensorTest {

  private JavaScriptSquidSensor sensor;
  SensorContext context;

  @Before
  public void init() {
    sensor = new JavaScriptSquidSensor(new JavaScript(null));
    context = mock(SensorContext.class);
  }

  @Test
  public void testComplexityMeasures() throws URISyntaxException, IOException {

    final File file = new File(getClass().getResource("/org/sonar/plugins/javascript/complexity/SquidMetrics.js").toURI());
    InputFile inputFile = mock(InputFile.class);
    when(inputFile.getFile()).thenReturn(file);

    final ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());

    Project project = new Project("dummy") {

      public File getFile() {
        return file;
      }

      public ProjectFileSystem getFileSystem() {
        return fileSystem;
      }

      public Language getLanguage() {
        return new JavaScript(null);
      }
    };

    sensor.analyzeFile(inputFile, project, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.FILES), eq(1.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES), eq(55.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.COMMENT_LINES), eq(20.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.NCLOC), eq(25.0));

    assertEquals("JavaScriptSquidSensor", sensor.toString());
    assertTrue(sensor.shouldExecuteOnProject(project));
  }
}
