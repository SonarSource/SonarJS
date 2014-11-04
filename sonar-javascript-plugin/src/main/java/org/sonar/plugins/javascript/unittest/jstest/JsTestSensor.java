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

import org.apache.commons.lang.StringUtils;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.unittest.jstestdriver.JsTestDriverSensor;

public class JsTestSensor extends JsTestDriverSensor {

  public JsTestSensor(JavaScript javascript) {
    super(javascript);
  }

  public boolean shouldExecuteOnProject(Project project) {
    return javascript.equals(project.getLanguage())
      && StringUtils.isNotBlank(javascript.getSettings().getString(JavaScriptPlugin.JSTEST_REPORTS_PATH));
  }

  public void analyse(Project project, SensorContext context) {
    String jsTestDriverFolder = javascript.getSettings().getString(JavaScriptPlugin.JSTEST_REPORTS_PATH);
    collect(project, context, project.getFileSystem().resolvePath(jsTestDriverFolder));
  }

  protected org.sonar.api.resources.File getUnitTestFileResource(String classKey) {
    // For JsTest assume notation com/company/MyJsTest.js that maps directly to file name
    return new org.sonar.api.resources.File(classKey);
  }

  protected String getUnitTestFileName(String className) {
    return className;
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

}
