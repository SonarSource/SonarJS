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
package org.sonar.plugins.javascript.unittest.jstestdriver;

import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.Sensor;
import org.sonar.api.batch.SensorContext;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.api.scan.filesystem.FileQuery;
import org.sonar.api.scan.filesystem.ModuleFileSystem;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.unittest.surefireparser.AbstractSurefireParser;

import java.io.File;
import java.util.List;

public class JsTestDriverSensor implements Sensor {

  protected JavaScript javascript;
  protected ModuleFileSystem fileSystem;

  public JsTestDriverSensor(JavaScript javascript, ModuleFileSystem fileSystem) {
    this.javascript = javascript;
    this.fileSystem = fileSystem;
  }

  private static final Logger LOG = LoggerFactory.getLogger(JsTestDriverSensor.class);

  public boolean shouldExecuteOnProject(Project project) {
    return StringUtils.isNotBlank(getReportsDirectoryPath()) &&
      // Required for compatibility with SonarQube 3.7
      (javascript.KEY.equals(project.getLanguageKey())
        || StringUtils.isBlank(project.getLanguageKey()) && !fileSystem.files(FileQuery.onSource().onLanguage(JavaScript.KEY)).isEmpty());
  }

  public void analyse(Project project, SensorContext context) {
    collect(context, getIOFile(getReportsDirectoryPath()));
  }

  protected void collect(final SensorContext context, File reportsDir) {
    LOG.info("Parsing Unit Test run results in Surefire format from folder {}", reportsDir);

    new AbstractSurefireParser() {

      @Override
      protected Resource<?> getUnitTestResource(String classKey) {
        File unitTestFile = getUnitTestFile(fileSystem.testDirs(), getUnitTestFileName(classKey));
        return context.getResource(new org.sonar.api.resources.File(unitTestFile.getParent(), unitTestFile.getName()));
      }
    }.collect(context, reportsDir);

  }

  protected String getUnitTestFileName(String className) {
    // For JsTestDriver assume notation com.company.MyJsTest that maps to com/company/MyJsTest.js
    String fileName = className.substring((className.indexOf('.') + 1));
    fileName = fileName.replace('.', '/');
    fileName = fileName + ".js";
    return fileName;
  }

  protected File getUnitTestFile(List<File> testDirectories, String name) {
    File unitTestFile = new File("");
    for (File dir : testDirectories) {
      unitTestFile = new File(dir, name);

      if (unitTestFile.exists()) {
        break;
      }
    }
    return unitTestFile;
  }

  /**
   * Returns a java.io.File for the given path.
   * If path is not absolute, returns a File with project base directory as parent path.
   */
  protected File getIOFile(String path) {
    File file = new File(path);
    if (!file.isAbsolute()) {
      file = new File(fileSystem.baseDir(), path);
    }

    return file;
  }

  protected String getReportsDirectoryPath() {
    return javascript.getSettings().getString(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH);
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }
}
