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
package org.sonar.plugins.javascript.unittest.jstest;

import org.sonar.api.batch.SensorContext;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.unittest.jstestdriver.JsTestDriverSensor;

public class JsTestSensor extends JsTestDriverSensor {

  public JsTestSensor(FileSystem fileSystem, Settings settings) {
    super(fileSystem, settings);
  }

  @Override
  public void analyse(Project project, SensorContext context) {
    String jsTestDriverFolder = getReportsDirectoryPath();
    collect(context, getIOFile(jsTestDriverFolder));
  }

  @Override
  protected String getUnitTestFileName(String className) {
    // For JsTest assume notation com/company/MyJsTest.js that maps directly to file name
    return className;
  }

  @Override
  protected String getReportsDirectoryPath() {
    return settings.getString(JavaScriptPlugin.JSTEST_REPORTS_PATH);
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

}
