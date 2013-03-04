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

import org.junit.Test;
import org.sonar.api.CoreProperties;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.PropertyDefinitions;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.*;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TestUtils;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.Matchers.anyObject;
import static org.mockito.Matchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

public class JavaScriptSourceImporterTest {

  @Test
  public void testSourceImporter() {
    SensorContext context = mock(SensorContext.class);
    Project project = mockProject();
    Settings config = new Settings(new PropertyDefinitions(JavaScriptPlugin.class));
    config.setProperty(CoreProperties.CORE_IMPORT_SOURCES_PROPERTY, true);    
    JavaScriptSourceImporter importer = new JavaScriptSourceImporter(TestUtils.mockJavaScriptLanguage());
    importer.shouldExecuteOnProject(project); 
    
    importer.analyse(project, context);

    verify(context).saveSource((Resource<?>) anyObject(), eq("This is content for PersonTest.js JavaScript file used in unit tests."));
  }
  
  private Project mockProject() {    
    File baseDir;
    try{
      baseDir = new File(getClass().getResource("/org/sonar/plugins/javascript/core/").toURI());
    } catch (java.net.URISyntaxException e) {
      System.out.println("Error while mocking project: " + e);
      return null;
    }
    
    List<File> srcDirs = new ArrayList<File>(); 
    srcDirs.add(baseDir);            
    Project project = TestUtils.mockProject(baseDir, srcDirs, new ArrayList<File>());
          
    return project;
  }
}
