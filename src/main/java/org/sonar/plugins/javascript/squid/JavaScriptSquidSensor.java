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

import java.io.File;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScript;
import org.sonar.plugins.javascript.JavaScriptFile;
import org.sonar.squid.measures.Metric;
import org.sonar.squid.text.Source;

public final class JavaScriptSquidSensor implements Sensor {

  private final static Logger LOG = LoggerFactory.getLogger(JavaScriptSquidSensor.class);
  private JavaScript javascript;

  public JavaScriptSquidSensor(JavaScript javascript) {
    this.javascript = javascript;
  }

  public boolean shouldExecuteOnProject(Project project) {
    return javascript.equals(project.getLanguage());
  }

  public void analyse(Project project, SensorContext sensorContext) {
    for (File file : project.getFileSystem().getSourceFiles(javascript)) {
      try {
        analyzeFile(file, project.getFileSystem(), sensorContext);
      } catch (Exception e) {
        LOG.error("Can not analyze the file " + file.getAbsolutePath(), e);
      }
    }
  }

  protected void analyzeFile(File file, ProjectFileSystem projectFileSystem, SensorContext sensorContext) throws IOException {
    Reader reader = null;
    try {
      reader = new StringReader(FileUtils.readFileToString(file, projectFileSystem.getSourceCharset().name()));
      Resource resource = JavaScriptFile.fromIOFile(file, projectFileSystem.getSourceDirs());
      Source source = new Source(reader, new JavaScriptRecognizer(), new String[] {});

      sensorContext.saveMeasure(resource, CoreMetrics.FILES, 1.0);

      sensorContext.saveMeasure(resource, CoreMetrics.LINES, (double) source.getMeasure(Metric.LINES));

      sensorContext.saveMeasure(resource, CoreMetrics.COMMENT_LINES, (double) source.getMeasure(Metric.COMMENT_LINES));

      sensorContext.saveMeasure(resource, CoreMetrics.NCLOC, (double) source.getMeasure(Metric.LINES_OF_CODE));

    } finally {
      IOUtils.closeQuietly(reader);
    }
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }
}
