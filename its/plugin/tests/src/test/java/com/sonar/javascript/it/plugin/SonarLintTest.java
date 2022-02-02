/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2022 SonarSource SA
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
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonarsource.sonarlint.core.NodeJsHelper;
import org.sonarsource.sonarlint.core.StandaloneSonarLintEngineImpl;
import org.sonarsource.sonarlint.core.client.api.common.Language;
import org.sonarsource.sonarlint.core.client.api.common.LogOutput;
import org.sonarsource.sonarlint.core.client.api.common.Version;
import org.sonarsource.sonarlint.core.client.api.common.analysis.ClientInputFile;
import org.sonarsource.sonarlint.core.client.api.common.analysis.Issue;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneAnalysisConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneGlobalConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneSonarLintEngine;

import static java.util.Collections.singleton;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/**
 * NOTE on how SonarLint resolves NodeJS path
 * 1. It takes property `sonar.nodejs.executable` set by user
 * 2. If it's not available, NodeJS used by IDE is taken
 * 3. Before loading the SonarJS plugin SonarLint checks that version of NodeJS is compatible with SonarJS
 * 4. SonarLint skips loading the plugin if version is not compatible
 * 5. `sonar.nodejs.executable` is set to NodeJS used by IDE if it was used on step 2. That way SonarJS is using the same NodeJS as SonarLint
 *
 * Note that in the following tests we use {@link StandaloneGlobalConfiguration.Builder#setNodeJs(Path, Version)} as that's the only way to make sonarlint-core aware of NodeJS.
 * The logic described above is specific to various SonarLint flavours and not part of sonarlint-core.
 */
class SonarLintTest {

  private static final String FILE_PATH = "foo.js";
  private final static List<String> LOGS = new ArrayList<>();

  @TempDir
  File baseDir;
  private StandaloneSonarLintEngine sonarlintEngine;

  @TempDir
  Path sonarLintHome;

  @BeforeEach
  public void prepare() throws Exception {
    StandaloneGlobalConfiguration sonarLintConfig = getSonarLintConfig();
    sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);
  }

  @AfterEach
  public void stop() {
    sonarlintEngine.stop();
  }

  @Test
  void should_raise_issues() throws IOException {
    List<Issue> issues = analyze(FILE_PATH, "function foo() { \n"
      + "  var a; \n"
      + "  var c; // NOSONAR\n"
      + "  var b = 42; \n"
      + "} \n");
    String filePath = new File(baseDir, FILE_PATH).getAbsolutePath();
    assertThat(issues).extracting("ruleKey", "startLine", "inputFile.path", "severity").containsOnly(
      tuple("javascript:S1481", 2, filePath, "MINOR"),
      tuple("javascript:S1481", 4, filePath, "MINOR"),
      tuple("javascript:S1854", 4, filePath, "MAJOR"));

    assertThat(LOGS.stream().anyMatch(s -> s.matches("Using Node\\.js executable .* from property sonar\\.nodejs\\.executable\\."))).isTrue();
  }

  @Test
  void should_start_node_server_once() throws Exception {
    analyze(FILE_PATH, "");
    assertThat(LOGS).doesNotContain("eslint-bridge server is up, no need to start.");
    analyze(FILE_PATH, "");
    assertThat(LOGS).contains("eslint-bridge server is up, no need to start.");
  }

  @Test
  void should_analyze_typescript() throws Exception {
    Files.write(baseDir.toPath().resolve("tsconfig.json"), singleton("{}"));
    List<Issue> issues = analyze("foo.ts", "x = true ? 42 : 42");
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("typescript:S3923");
  }

  @Test
  void should_analyze_vue() throws IOException {
    String fileName = "file.vue";
    Path filePath = TestUtils.projectDir("vue-js-project").toPath().resolve(fileName);

    String content = Files.lines(filePath).collect(Collectors.joining(System.lineSeparator()));
    List<Issue> issues = analyze(fileName, content);

    assertThat(issues).extracting("ruleKey").containsOnly("javascript:S3923");
  }

  @Test
  void should_not_analyze_ts_project_without_config() throws Exception {
    List<Issue> issues = analyze("foo.ts", "x = true ? 42 : 42");
    assertThat(issues).isEmpty();
    assertThat(LOGS).contains("No tsconfig.json file found, analysis will be skipped.");
  }

  @Test
  void should_log_failure_only_once() throws IOException {
    // we need to stop engine initialized in @BeforeEach prepare() method, because we need configuration with different node
    sonarlintEngine.stop();
    // version `42` will let us pass SonarLint check of version
    sonarlintEngine = new StandaloneSonarLintEngineImpl(getSonarLintConfig(new File("invalid/path/node").toPath(), Version.create("42")));
    List<Issue> issues = analyze(FILE_PATH, "");
    assertThat(LOGS).contains("Provided Node.js executable file does not exist.");
    assertThat(issues).isEmpty();
    LOGS.clear();
    issues = analyze(FILE_PATH, "");
    assertThat(issues).isEmpty();
    assertThat(LOGS)
      .doesNotContain("Provided Node.js executable file does not exist.")
      .contains("Skipping the start of eslint-bridge server as it failed to start during the first analysis or it's not answering anymore");
  }

  @Test
  void should_apply_quick_fix() throws Exception {
    List<Issue> issues = analyze("foo.js", "var x = 5;;");
    assertThat(issues).hasSize(1);
    var issue = issues.get(0);
    assertThat(issue.getRuleKey()).isEqualTo("javascript:S1116");
    assertThat(issue.quickFixes()).hasSize(1);
    var quickFix = issue.quickFixes().get(0);
    assertThat(quickFix.message()).isEqualTo("Fix this");
    assertThat(quickFix.inputFileEdits()).hasSize(1);
    var fileEdit = quickFix.inputFileEdits().get(0);
    assertThat(fileEdit.textEdits()).hasSize(1);
    var textEdit = fileEdit.textEdits().get(0);
    assertThat(textEdit.newText()).isEqualTo(";");
    assertThat(textEdit.range().start().line()).isEqualTo(1);
    assertThat(textEdit.range().start().lineOffset()).isEqualTo(9);
    assertThat(textEdit.range().end().line()).isEqualTo(1);
    assertThat(textEdit.range().end().lineOffset()).isEqualTo(11);
  }

  private List<Issue> analyze(String filePath, String sourceCode) throws IOException {
    ClientInputFile inputFile = TestUtils.prepareInputFile(baseDir, filePath, sourceCode);

    List<Issue> issues = new ArrayList<>();
    sonarlintEngine.analyze(
      StandaloneAnalysisConfiguration.builder().setBaseDir(baseDir.toPath()).addInputFile(inputFile).build(),
      issues::add, null, null);
    return issues;
  }

  private StandaloneGlobalConfiguration getSonarLintConfig() throws IOException {
    NodeJsHelper nodeJsHelper = new NodeJsHelper();
    nodeJsHelper.detect(null);

    return getSonarLintConfig(nodeJsHelper.getNodeJsPath(), nodeJsHelper.getNodeJsVersion());
  }

  private StandaloneGlobalConfiguration getSonarLintConfig(Path nodePath, Version nodeVersion) throws IOException {
    LogOutput logOutput = (formattedMessage, level) -> {
      LOGS.add(formattedMessage);
      System.out.println(formattedMessage);
    };

    return StandaloneGlobalConfiguration.builder()
      .addEnabledLanguage(Language.JS)
      .addEnabledLanguage(Language.TS)
      .addPlugin(OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION.getFile().toURI().toURL())
      .setSonarLintUserHome(sonarLintHome)
      .setLogOutput(logOutput)
      .setNodeJs(nodePath, nodeVersion)
      .build();
  }

}
