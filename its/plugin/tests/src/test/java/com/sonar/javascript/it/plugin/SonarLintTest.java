/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2020 SonarSource SA
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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

import static java.util.Collections.singleton;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

public class SonarLintTest {

  private static final String FILE_PATH = "foo.js";
  @ClassRule
  public static TemporaryFolder temp = new TemporaryFolder();

  private StandaloneSonarLintEngine sonarlintEngine;

  private static File baseDir;

  private static List<String> logs = new ArrayList<>();
  private static StandaloneGlobalConfiguration sonarLintConfig;

  @BeforeClass
  public static void prepare() throws Exception {
    sonarLintConfig = StandaloneGlobalConfiguration.builder()
      .addPlugin(Tests.JAVASCRIPT_PLUGIN_LOCATION.getFile().toURI().toURL())
      .setSonarLintUserHome(temp.newFolder().toPath())
      .setLogOutput((formattedMessage, level) -> logs.add(formattedMessage))
      .build();
    baseDir = temp.newFolder();
  }

  @Test
  public void should_raise_three_issues() throws IOException {
    sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);
    List<Issue> issues = analyze(FILE_PATH, "function foo() { \n"
      + "  var a; \n"
      + "  var c; // NOSONAR\n"
      + "  var b = 42; \n"
      + "} \n");
    sonarlintEngine.stop();
    String filePath = new File(baseDir, FILE_PATH).getAbsolutePath();
    assertThat(issues).extracting("ruleKey", "startLine", "inputFile.path", "severity").containsOnly(
      tuple("javascript:S1481", 2, filePath, "MINOR"),
      tuple("javascript:S1481", 4, filePath, "MINOR"),
      tuple("javascript:S1854", 4, filePath, "MAJOR"));
  }

  @Test
  public void should_run_eslint_based_rules() throws Exception {
    sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);
    String sourceCode = "function foo() { try {" +
      "  doSomething();" +
      "} catch (ex) {" +
      "  throw ex;" +
      "}}";
    List<Issue> issues = analyze(FILE_PATH, sourceCode);
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("javascript:S2737");
    // let's analyze again
    issues = analyze(FILE_PATH, sourceCode);
    sonarlintEngine.stop();
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("javascript:S2737");
    assertThat(logs).contains("SonarJS eslint-bridge server is up, no need to start.");
  }

  @Test
  public void should_analyze_typescript() throws Exception {
    // emulate typescript installation provided by vscode
    File typescriptInstall = temp.newFolder();
    TestUtils.npmInstall(typescriptInstall, "typescript");
    HashMap<String, String> properties = new HashMap<>();
    Path tsNodeModules = typescriptInstall.toPath().resolve("node_modules").toAbsolutePath();
    properties.put("sonar.typescript.internal.typescriptLocation", tsNodeModules.toString());

    StandaloneGlobalConfiguration sonarLintConfig = StandaloneGlobalConfiguration.builder()
      .addPlugin(Tests.JAVASCRIPT_PLUGIN_LOCATION.getFile().toURI().toURL())
      .setSonarLintUserHome(temp.newFolder().toPath())
      .setLogOutput((formattedMessage, level) -> logs.add(formattedMessage))
      .setExtraProperties(properties)
      .build();
    StandaloneSonarLintEngine sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);

    ClientInputFile inputFile = TestUtils.prepareInputFile(baseDir, "foo.ts", "x = true ? 42 : 42");
    // we have to provide tsconfig.json
    Files.write(baseDir.toPath().resolve("tsconfig.json"), singleton("{}"));

    List<Issue> issues = new ArrayList<>();
    StandaloneAnalysisConfiguration configuration = StandaloneAnalysisConfiguration.builder()
      .setBaseDir(baseDir.toPath())
      .addInputFile(inputFile)
      .build();
    sonarlintEngine.analyze(
      configuration,
      issues::add, (formattedMessage, level) -> logs.add(formattedMessage), null);

    // we need to stop the engine to make sure that sonarlint will not concurrently modify logs collection
    sonarlintEngine.stop();
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("typescript:S3923");
    assertThat(logs).contains("Using TypeScript at: '" + tsNodeModules + "'");
  }

  @Test
  public void should_not_analyze_ts_project_without_config() throws Exception {
    // emulate typescript installation provided by vscode
    File typescriptInstall = temp.newFolder();
    TestUtils.npmInstall(typescriptInstall, "typescript");
    HashMap<String, String> properties = new HashMap<>();
    Path tsNodeModules = typescriptInstall.toPath().resolve("node_modules").toAbsolutePath();
    properties.put("sonar.typescript.internal.typescriptLocation", tsNodeModules.toString());

    StandaloneGlobalConfiguration sonarLintConfig = StandaloneGlobalConfiguration.builder()
      .addPlugin(Tests.JAVASCRIPT_PLUGIN_LOCATION.getFile().toURI().toURL())
      .setSonarLintUserHome(temp.newFolder().toPath())
      .setLogOutput((formattedMessage, level) -> logs.add(formattedMessage))
      .setExtraProperties(properties)
      .build();
    StandaloneSonarLintEngine sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);

    File baseDir = temp.newFolder();
    ClientInputFile inputFile = TestUtils.prepareInputFile(baseDir, "foo.ts", "x = true ? 42 : 42");

    List<Issue> issues = new ArrayList<>();
    StandaloneAnalysisConfiguration configuration = StandaloneAnalysisConfiguration.builder()
      .setBaseDir(baseDir.toPath())
      .addInputFile(inputFile)
      .build();
    sonarlintEngine.analyze(
      configuration,
      issues::add, (formattedMessage, level) -> logs.add(formattedMessage), null);

    // we need to stop the engine to make sure that sonarlint will not concurrently modify logs collection
    sonarlintEngine.stop();
    assertThat(issues).isEmpty();
    assertThat(logs).contains("No tsconfig.json file found, analysis will be stopped.");
  }


  private List<Issue> analyze(String filePath, String sourceCode) throws IOException {
    ClientInputFile inputFile = TestUtils.prepareInputFile(baseDir, filePath, sourceCode);

    List<Issue> issues = new ArrayList<>();
    sonarlintEngine.analyze(
      StandaloneAnalysisConfiguration.builder().setBaseDir(baseDir.toPath()).addInputFile(inputFile).build(),
      issues::add, null, null);
    return issues;
  }

}
