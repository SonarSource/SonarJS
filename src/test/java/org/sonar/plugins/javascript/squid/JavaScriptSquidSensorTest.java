/**
 * Sonar JavaScript Plugin
 * Extension for Sonar, open source software quality management tool.
 * Copyright (C) 2011 Eriks Nukis
 * mailto: eriks.nukis@gmail.com
 *
 * Sonar JavaScript Plugin is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * Sonar JavaScript Plugin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with Sonar JavaScript Plugin; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

package org.sonar.plugins.javascript.squid;

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
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;

public class JavaScriptSquidSensorTest {

  private JavaScriptSquidSensor sensor;
  SensorContext context;

  @Before
  public void init() {
    sensor = new JavaScriptSquidSensor(null);
    context = mock(SensorContext.class);
  }

  @Test
  public void testComplexityMeasures() throws URISyntaxException, IOException {

    File file = new File(getClass().getResource("/org/sonar/plugins/javascript/complexity/SquidMetrics.js").toURI());

    ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());

    sensor.analyzeFile(file, fileSystem, context);

    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.FILES), eq(1.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.LINES), eq(55.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.COMMENT_LINES), eq(20.0));
    verify(context).saveMeasure((Resource) anyObject(), eq(CoreMetrics.NCLOC), eq(25.0));
  }
}
