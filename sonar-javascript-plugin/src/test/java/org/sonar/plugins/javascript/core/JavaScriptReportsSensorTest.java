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

import org.junit.Before;
import org.junit.Test;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.TestUtils;
import static org.mockito.Mockito.when;
import java.io.File;
import java.util.List;

public class JavaScriptReportsSensorTest {
	
  private final String VALID_REPORT_PATH = "surefire-reports/sample-*.xml";
  private final String INVALID_REPORT_PATH = "something";
  private final String REPORT_PATH_PROPERTY_KEY = "javascript.reportPath";

  private class JavaScriptSensorImpl extends JavaScriptReportsSensor {
    @Override
    public void analyse(Project p, SensorContext sc) {
    }
  };
  
  private JavaScriptSensorImpl sensor;
  private File baseDir;
  
  @Before
  public void init() {
    sensor = new JavaScriptSensorImpl();
    try {
      baseDir = new File(getClass().getResource("/org/sonar/plugins/javascript/").toURI());
    } catch (java.net.URISyntaxException e) {
      System.out.println(e);
    }
  }
  
  @Test
  public void shouldntThrowWhenInstantiating() {
    new JavaScriptSensorImpl();
  }
  
  @Test
  public void shouldExecuteOnlyWhenNecessary() {
    // which means: only on javascript projects
	  JavaScriptReportsSensor sensor = new JavaScriptSensorImpl();
    Project jsProject = mockProjectWithLanguageKey(JavaScript.KEY);
    Project foreignProject = mockProjectWithLanguageKey("whatever");
    assert (sensor.shouldExecuteOnProject(jsProject));
    assert (!sensor.shouldExecuteOnProject(foreignProject));
  }

  @Test
  public void getReports_shouldFindSomethingIfThere() {
    List<File> reports = sensor.getReports(new Settings(), baseDir.getPath(),
        "", VALID_REPORT_PATH);
    assertFound(reports);
  }

  @Test
  public void getReports_shouldFindNothingIfNotThere() {
    List<File> reports = sensor.getReports(new Settings(), baseDir.getPath(),
        "", INVALID_REPORT_PATH);
    assertNotFound(reports);
  }

  @Test
  public void getReports_shouldUseConfigurationWithHigherPriority() {
    // we'll detect this condition by passing something not existing as config property
    // and something existing as default. The result is 'found nothing' because the
    // config has been used
    Settings config = new Settings();
    config.setProperty(REPORT_PATH_PROPERTY_KEY, INVALID_REPORT_PATH);

    List<File> reports = sensor.getReports(config, baseDir.getPath(),
        REPORT_PATH_PROPERTY_KEY, VALID_REPORT_PATH);
    assertNotFound(reports);
  }

  @Test
  public void getReports_shouldFallbackToDefaultIfNothingConfigured() {
    List<File> reports = sensor.getReports(new Settings(), baseDir.getPath(),
        REPORT_PATH_PROPERTY_KEY, VALID_REPORT_PATH);
    assertFound(reports);
  }

  private void assertFound(List<File> reports) {
    assert (reports != null);
    assert (reports.size() == 1);
    assert (reports.get(0).exists());
    assert (reports.get(0).isAbsolute());
  }

  private void assertNotFound(List<File> reports) {
    assert (reports != null);
  }

  private static Project mockProjectWithLanguageKey(String languageKey) {
    Project project = TestUtils.mockProject();
    when(project.getLanguageKey()).thenReturn(languageKey);
    return project;
  }  
  
}
