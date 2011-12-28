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
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.core.JavaScript;
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
    for (InputFile inputFile : project.getFileSystem().mainFiles(JavaScript.KEY)) {
      try {
        analyzeFile(inputFile, project, sensorContext);
      } catch (Exception e) {
        LOG.error("Can not analyze the file " + inputFile.getFileBaseDir() + inputFile.getRelativePath(), e);
      }
    }
  }

  protected void analyzeFile(InputFile inputFile, Project project, SensorContext sensorContext) throws IOException {
    Reader reader = null;
    try {
      reader = new StringReader(FileUtils.readFileToString(inputFile.getFile(), project.getFileSystem().getSourceCharset().name()));

      org.sonar.api.resources.File resource = org.sonar.api.resources.File.fromIOFile(inputFile.getFile(), project);

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