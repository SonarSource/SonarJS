/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis and SonarSource
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
package org.sonar.plugins.javascript.core;

import org.apache.commons.configuration.Configuration;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.CoreProperties;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.*;

import java.io.File;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class JavaScriptSourceImporterTest {

  private Configuration configuration;
  private JavaScript language;

  @Before
  public void init() {
    language = new JavaScript(new Settings());
    configuration = mock(Configuration.class);
    when(configuration.getBoolean(CoreProperties.CORE_IMPORT_SOURCES_PROPERTY, CoreProperties.CORE_IMPORT_SOURCES_DEFAULT_VALUE))
        .thenReturn(true);
  }

  @Test
  public void testSourceImporter() throws URISyntaxException {
    SensorContext context = mock(SensorContext.class);
    JavaScriptSourceImporter importer = new JavaScriptSourceImporter(language);
    assertEquals("JavaScriptSourceImporter", importer.toString());

    final ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());

    File sourceDir = new File(getClass().getResource("/org/sonar/plugins/javascript/core/filestoimport/sourceDirectory").toURI());
    List<File> sourceDirectories = new ArrayList<File>();
    sourceDirectories.add(sourceDir);

    List<File> files = new ArrayList<File>();
    File fileToImport = new File(getClass().getResource("/org/sonar/plugins/javascript/core/filestoimport/sourceDirectory/Person.js")
        .toURI());
    files.add(fileToImport);

    when(fileSystem.getSourceDirs()).thenReturn(sourceDirectories);

    List<InputFile> inputFiles = InputFileUtils.create(sourceDir, files);
    when(fileSystem.mainFiles(JavaScript.KEY)).thenReturn(inputFiles);

    Project project = new Project("dummy") {

      public ProjectFileSystem getFileSystem() {
        return fileSystem;
      }

      public Language getLanguage() {
        return language;
      }

      public Configuration getConfiguration() {
        return configuration;
      }
    };

    importer.analyse(project, context);

    verify(context).saveSource((Resource) anyObject(), eq("This is content for PersonTest.js JavaScript file used in unit tests."));
  }
}
