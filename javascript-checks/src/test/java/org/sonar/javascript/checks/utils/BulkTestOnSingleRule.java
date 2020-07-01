/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
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
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.javascript.checks.utils;

import java.io.File;
import java.io.IOException;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.verifier.BulkVerifier;
import org.sonar.javascript.checks.verifier.DifferentialIssueCollector;
import org.sonar.javascript.checks.verifier.ExpectedIssueCollector;
import org.sonar.javascript.checks.verifier.ExpectedIssues;
import org.sonar.javascript.checks.verifier.IssueCollector;
import org.sonar.plugins.javascript.api.JavaScriptCheck;

/**
 * Class to test one single rule on a set of JavaScript files.
 */
public class BulkTestOnSingleRule {

  private static final Logger LOGGER = Loggers.get(BulkTestOnSingleRule.class);

  public static void main(String[] args) throws IOException {
    if (args.length == 1) {
      execute(args[0], "javascript-checks-testkit/target/expected.txt", "its/sources/src");
    } else if (args.length == 3) {
      execute(args[0], args[1], args[2]);
    } else {
      LOGGER.error("First argument = fully-qualified check class name. Second argument (optional) = ignored issues file. Third argument (optional) = JS files directory");
    }
  }

  private static void execute(String checkClassName, String expectedIssuesFileName, String sourceDirectory) throws IOException {
    final File expectedIssuesFile = new File(expectedIssuesFileName);
    IssueCollector issueCollector;
    if (expectedIssuesFile.exists()) {
      issueCollector = new DifferentialIssueCollector(ExpectedIssues.parse(expectedIssuesFile), LOGGER::warn);
    } else {
      issueCollector = new ExpectedIssueCollector(expectedIssuesFile);
    }
    new BulkVerifier(getCheckClass(checkClassName), issueCollector).scanDirectory(new File(sourceDirectory));
  }

  private static Class<JavaScriptCheck> getCheckClass(String checkClassName) {
    Class<?> clazz;
    try {
      clazz = Class.forName(checkClassName);
    } catch (ClassNotFoundException e) {
      throw new IllegalArgumentException("Exception when attempting to load : " + checkClassName, e);
    }
    if (JavaScriptCheck.class.isAssignableFrom(clazz)) {
      return (Class<JavaScriptCheck>) clazz;
    } else {
      throw new IllegalArgumentException("Class " + checkClassName + " is not a JavaScriptCheck");
    }
  }

}
