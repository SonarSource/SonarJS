/*
 * SonarSource :: JavaScript :: ITs :: Plugin :: Tests
 * Copyright (C) 2012 SonarSource
 * sonarqube@googlegroups.com
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
package com.sonar.javascript.it.plugin;

import org.apache.commons.io.FileUtils;

import java.io.File;

public class TestUtils {

  private static final File HOME;

  static {
    File testResources = FileUtils.toFile(TestUtils.class.getResource("/TestUtils.txt"));

    HOME = testResources // home/tests/src/tests/resources
      .getParentFile() // home/tests/src/tests
      .getParentFile() // home/tests/src
      .getParentFile() // home/tests
      .getParentFile(); // home
  }

  public static File homeDir() {
    return HOME;
  }

  public static File projectDir(String projectName) {
    return new File(homeDir(), "projects/" + projectName);
  }

  public static File pluginJar(String artifactId) {
    return new File(homeDir(), "plugins/" + artifactId + "/target/" + artifactId + "-1.0-SNAPSHOT.jar");
  }

  public static File file(String relativePath) {
    return new File(homeDir(), relativePath);
  }

}
