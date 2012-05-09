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
package org.sonar.plugins.javascript.jslint;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.ArrayList;

import org.apache.commons.configuration.Configuration;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.profiles.RulesProfile;
import org.sonar.api.resources.InputFile;
import org.sonar.api.resources.InputFileUtils;
import org.sonar.api.resources.Language;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.ProjectFileSystem;
import org.sonar.api.rules.RuleFinder;
import org.sonar.plugins.javascript.core.JavaScript;

public class JavaScriptJsLintSensorTest {

  JavaScriptJSLintSensor sensor;
  SensorContext sensorContext;
  Configuration configuration;

  @Before
  public void init() {
    RuleFinder finder = mock(RuleFinder.class);
    configuration = mock(Configuration.class);
    JsLintRuleManager rulesManager = new JsLintRuleManager("/org/sonar/plugins/javascript/jslint/default/rules.xml");
    JavaScriptRuleRepository repository = new JavaScriptRuleRepository(new JavaScript(null), rulesManager);
    JavaScriptDefaultProfile profile = new JavaScriptDefaultProfile(repository);
    
    RulesProfile qualityProfile = profile.createProfile(null);

    sensor = new JavaScriptJSLintSensor(finder, new JavaScript(null), qualityProfile, rulesManager, configuration);

    sensorContext = mock(SensorContext.class);
  }

  @Test
  public void testViolations() throws IOException, URISyntaxException {
    File fileToAnalyse = new File(getClass().getResource("/org/sonar/plugins/javascript/jslint/default/Violations.js").toURI());
    File baseDir = new File(getClass().getResource("/org/sonar/plugins/javascript/jslint/default").toURI());

    InputFile inputFile = InputFileUtils.create(baseDir, fileToAnalyse);

    Project project = getProject(inputFile);

    sensor.analyzeFile(inputFile, project, sensorContext);

    // checks for violations in Violations.js file should be added
  }

  private Project getProject(InputFile inputFile) throws URISyntaxException {
    final ProjectFileSystem fileSystem = mock(ProjectFileSystem.class);
    when(fileSystem.getSourceCharset()).thenReturn(Charset.defaultCharset());

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
}
