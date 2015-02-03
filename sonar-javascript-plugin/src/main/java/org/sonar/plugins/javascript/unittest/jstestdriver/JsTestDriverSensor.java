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
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.config.Settings;
import org.sonar.api.resources.Project;
import org.sonar.api.resources.Resource;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.core.JavaScript;
import org.sonar.plugins.javascript.unittest.surefireparser.AbstractSurefireParser;

import java.io.File;

public class JsTestDriverSensor implements Sensor {

  protected FileSystem fileSystem;
  protected Settings settings;
  private final FilePredicate mainFilePredicate;
  private final FilePredicate testFilePredicate;

  public JsTestDriverSensor(FileSystem fileSystem, Settings settings) {
    this.fileSystem = fileSystem;
    this.settings = settings;
    this.mainFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScript.KEY));

    this.testFilePredicate = fileSystem.predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.TEST),
      fileSystem.predicates().hasLanguage(JavaScript.KEY));
  }

  private static final Logger LOG = LoggerFactory.getLogger(JsTestDriverSensor.class);

  @Override
  public boolean shouldExecuteOnProject(Project project) {
    return StringUtils.isNotBlank(getReportsDirectoryPath()) && fileSystem.hasFiles(mainFilePredicate);
  }

  @Override
  public void analyse(Project project, SensorContext context) {
    collect(context, getIOFile(getReportsDirectoryPath()));
  }

  protected void collect(final SensorContext context, File reportsDir) {
    LOG.info("Parsing Unit Test run results in Surefire format from folder {}", reportsDir);

    new AbstractSurefireParser() {

      @Override
      protected Resource getUnitTestResource(String classKey) {
        fileSystem.predicates().hasType(InputFile.Type.MAIN);
        org.sonar.api.resources.File sonarFile = org.sonar.api.resources.File.create(getTestFileRelativePathToBaseDir(getUnitTestFileName(classKey)));

        return context.getResource(sonarFile);
      }
    }.collect(context, reportsDir);
  }

  protected String getUnitTestFileName(String className) {
    // For JsTestDriver assume notation com.company.MyJsTest that maps to com/company/MyJsTest.js
    String fileName = className.substring(className.indexOf('.') + 1);
    fileName = fileName.replace('.', '/');
    fileName = fileName + ".js";
    return fileName;
  }

  protected String getTestFileRelativePathToBaseDir(String name) {
    for (InputFile inputFile : fileSystem.inputFiles(testFilePredicate)) {
      if (inputFile.file().getAbsolutePath().endsWith(name)) {
        return inputFile.relativePath();
      }
    }
    return name;
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
    return settings.getString(JavaScriptPlugin.JSTESTDRIVER_REPORTS_PATH);
  }

  @Override
  public String toString() {
    return getClass().getSimpleName();
  }
}
