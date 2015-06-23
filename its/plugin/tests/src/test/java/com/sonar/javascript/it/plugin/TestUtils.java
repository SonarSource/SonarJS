/*
 * Copyright (C) 2012-2014 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
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
