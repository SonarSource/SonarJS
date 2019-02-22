/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2019 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonarsource.sonarlint.core.StandaloneSonarLintEngineImpl;
import org.sonarsource.sonarlint.core.client.api.common.analysis.ClientInputFile;
import org.sonarsource.sonarlint.core.client.api.common.analysis.Issue;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneAnalysisConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneGlobalConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneSonarLintEngine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

public class SonarLintTest {

  private static final String FILE_PATH = "foo.js";
  @ClassRule
  public static TemporaryFolder temp = new TemporaryFolder();

  private static StandaloneSonarLintEngine sonarlintEngine;

  private static File baseDir;

  private static List<String> logs = new ArrayList<>();

  @BeforeClass
  public static void prepare() throws Exception {
    StandaloneGlobalConfiguration sonarLintConfig = StandaloneGlobalConfiguration.builder()
      .addPlugin(Tests.JAVASCRIPT_PLUGIN_LOCATION.getFile().toURI().toURL())
      .setSonarLintUserHome(temp.newFolder().toPath())
      .setLogOutput((formattedMessage, level) -> logs.add(formattedMessage))
      .build();
    sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);
    baseDir = temp.newFolder();
  }

  @AfterClass
  public static void stop() {
    sonarlintEngine.stop();
  }

  @Test
  public void should_raise_three_issues() throws IOException {
    List<Issue> issues = analyze(FILE_PATH, "function foo() { \n"
      + "  var a; \n"
      + "  var c; // NOSONAR\n"
      + "  var b = 42; \n"
      + "} \n");

    String filePath = new File(baseDir, FILE_PATH).getAbsolutePath();
    assertThat(issues).extracting("ruleKey", "startLine", "inputFile.path", "severity").containsOnly(
      tuple("javascript:UnusedVariable", 2, filePath, "MINOR"),
      tuple("javascript:UnusedVariable", 4, filePath, "MINOR"),
      tuple("javascript:S1854", 4, filePath, "MAJOR"));
  }

  @Test
  public void should_run_eslint_based_rules() throws Exception {
    String sourceCode = "function foo() { try {" +
      "  doSomething();" +
      "} catch (ex) {" +
      "  throw ex;" +
      "}}";
    List<Issue> issues = analyze(FILE_PATH, sourceCode);
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("javascript:S2737");
    // let's analyze again
    issues = analyze(FILE_PATH, sourceCode);
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("javascript:S2737");
    assertThat(logs).contains("SonarJS eslint-bridge server is up, no need to start.");
  }


  private List<Issue> analyze(String filePath, String sourceCode) throws IOException {
    ClientInputFile inputFile = TestUtils.prepareInputFile(baseDir, filePath, sourceCode);

    List<Issue> issues = new ArrayList<>();
    sonarlintEngine.analyze(
      new StandaloneAnalysisConfiguration(baseDir.toPath(), temp.newFolder().toPath(), Arrays.asList(inputFile), new HashMap<>()),
      issues::add, null, null);
    return issues;
  }

}
