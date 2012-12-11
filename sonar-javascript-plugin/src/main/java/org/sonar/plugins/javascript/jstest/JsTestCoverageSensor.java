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
package org.sonar.plugins.javascript.jstest;

import org.sonar.api.resources.Project;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.jstestdriver.JsTestDriverCoverageSensor;

public final class JsTestCoverageSensor extends JsTestDriverCoverageSensor {

  public JsTestCoverageSensor(JavaScript javascript) {
    super(javascript);
  }

  public boolean shouldExecuteOnProject(Project project) {
    return javascript.equals(project.getLanguage())
      && "jstest".equals(javascript.getSettings().getString(JavaScriptPlugin.TEST_FRAMEWORK_KEY));
  }

  protected String getTestReportsFolder() {
    return javascript.getSettings().getString(JavaScriptPlugin.JSTEST_FOLDER_KEY);
  }

  protected String getTestCoverageFileName() {
    return javascript.getSettings().getString(JavaScriptPlugin.JSTEST_COVERAGE_FILE_KEY);
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }

}
