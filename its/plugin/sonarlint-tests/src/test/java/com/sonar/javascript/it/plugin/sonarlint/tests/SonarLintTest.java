/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package com.sonar.javascript.it.plugin.sonarlint.tests;

import static com.sonar.javascript.it.plugin.sonarlint.tests.TestUtils.usingEmbeddedNode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonarsource.sonarlint.core.NodeJsHelper;
import org.sonarsource.sonarlint.core.StandaloneSonarLintEngineImpl;
import org.sonarsource.sonarlint.core.analysis.api.ClientInputFile;
import org.sonarsource.sonarlint.core.analysis.api.QuickFix;
import org.sonarsource.sonarlint.core.analysis.api.WithTextRange;
import org.sonarsource.sonarlint.core.client.api.common.analysis.Issue;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneAnalysisConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneGlobalConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneSonarLintEngine;
import org.sonarsource.sonarlint.core.commons.Language;
import org.sonarsource.sonarlint.core.commons.Version;
import org.sonarsource.sonarlint.core.commons.log.ClientLogOutput;

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

  @TempDir
  Path baseDir;

  private StandaloneSonarLintEngine sonarlintEngine;
  private List<String> logs;

  @TempDir
  Path sonarLintHome;

  @BeforeEach
  void prepare() throws Exception {
    logs = new ArrayList<>();
    StandaloneGlobalConfiguration sonarLintConfig = getSonarLintConfig();
    sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);
  }

  @AfterEach
  void stop() {
    sonarlintEngine.stop();
  }

  @Test
  void should_raise_issues() throws IOException {
    List<Issue> issues = analyze(
      FILE_PATH,
      "function foo() { \n" + "  var a; \n" + "  var c; // NOSONAR\n" + "  var b = 42; \n" + "} \n"
    );
    String filePath = baseDir.resolve(FILE_PATH).toAbsolutePath().toString();
    assertThat(issues)
      .extracting(
        Issue::getRuleKey,
        WithTextRange::getStartLine,
        i -> Path.of(i.getInputFile().relativePath()).toAbsolutePath().toString(),
        i -> i.getSeverity().toString()
      )
      .containsExactlyInAnyOrder(
        tuple("javascript:S1481", 2, filePath, "MINOR"),
        tuple("javascript:S3504", 2, filePath, "CRITICAL"),
        tuple("javascript:S1481", 4, filePath, "MINOR"),
        tuple("javascript:S1854", 4, filePath, "MAJOR"),
        tuple("javascript:S3504", 4, filePath, "CRITICAL")
      );

    if (!usingEmbeddedNode()) {
      assertThat(
        logs
          .stream()
          .anyMatch(s ->
            s.matches(
              "Using Node\\.js executable '.*' from property 'sonar\\.nodejs\\.executable'\\."
            )
          )
      ).isTrue();
    }
  }

  @Test
  void should_start_node_server_once() throws Exception {
    analyze(FILE_PATH, "");
    assertThat(logs).doesNotContain("The bridge server is up, no need to start.");
    analyze(FILE_PATH, "");
    assertThat(logs).contains("The bridge server is up, no need to start.");
  }

  @Test
  void should_analyze_typescript() throws Exception {
    Files.writeString(baseDir.resolve("tsconfig.json"), "{}");
    var code = "x = true ? 42 : 42";
    var filename = "foo.ts";
    Files.writeString(baseDir.resolve(filename), code);
    List<Issue> issues = analyze(filename, code);
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("typescript:S3923");
  }

  @Test
  void should_analyze_vue() throws IOException {
    String fileName = "file.vue";
    Path filePath = TestUtils.projectDir("vue-js-project").resolve(fileName);

    String content = Files.readString(filePath);
    List<Issue> issues = analyze(fileName, content);

    assertThat(issues).extracting("ruleKey").containsOnly("javascript:S3923");
  }

  @Test
  void should_analyze_css() throws IOException {
    String fileName = "file.css";
    Path filePath = TestUtils.projectDir("css-sonarlint-project").resolve(fileName);

    String content = Files.readString(filePath);
    List<Issue> issues = analyze(fileName, content);
    assertThat(issues)
      .extracting(Issue::getRuleKey)
      .containsExactly("css:S1128", "css:S1116", "css:S4660");
  }

  @Test
  void should_analyze_js_with_typed_rules_except_vue() throws IOException {
    String fileName;
    String content;
    List<Issue> issues;

    fileName = "file.js";
    content = Files.readString(TestUtils.projectDir("js-sonarlint-project").resolve(fileName));
    issues = analyze(fileName, content);
    assertThat(issues)
      .extracting(Issue::getRuleKey)
      .contains("javascript:S2870", "javascript:S3504");

    fileName = "file.vue";
    content = Files.readString(TestUtils.projectDir("js-sonarlint-project").resolve(fileName));
    issues = analyze(fileName, content);
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("javascript:S3504");
  }

  @Test
  void should_log_failure_only_once() throws IOException {
    // we need to stop engine initialized in @BeforeEach prepare() method, because we need configuration with different node
    sonarlintEngine.stop();
    // version `42` will let us pass SonarLint check of version
    sonarlintEngine = new StandaloneSonarLintEngineImpl(
      getSonarLintConfig(new File("invalid/path/node").toPath(), Version.create("42"))
    );
    List<Issue> issues = analyze(FILE_PATH, "");
    assertThat(logs).contains("Provided Node.js executable file does not exist.");
    assertThat(issues).isEmpty();
    logs.clear();
    issues = analyze(FILE_PATH, "");
    assertThat(issues).isEmpty();
    assertThat(logs)
      .doesNotContain("Provided Node.js executable file does not exist.")
      .contains(
        "Skipping the start of the bridge server as it failed to start during the first analysis or it's not answering anymore"
      );
  }

  @Test
  void should_apply_quick_fix() throws Exception {
    var issues = analyze("foo.js", "this.foo = 1;");
    assertThat(issues).hasSize(1);
    var issue = issues.get(0);
    assertThat(issue.getRuleKey()).isEqualTo("javascript:S2990");
    assertThat(issue.quickFixes()).hasSize(2);
    var quickFix = issue.quickFixes().get(0);
    assertQuickFix(quickFix, "Remove \"this\"", "foo", 1, 0, 1, 8);
  }

  @Test
  void should_apply_quick_fix_from_not_core_eslint_rule() throws Exception {
    var issues = analyze("foo.js", "for (;i < 0;) { foo(i); }");
    assertThat(issues).hasSize(1);
    var issue = issues.get(0);
    assertThat(issue.getRuleKey()).isEqualTo("javascript:S1264");
    assertThat(issue.quickFixes()).hasSize(1);
    var quickFix = issue.quickFixes().get(0);
    assertQuickFix(quickFix, "Replace with 'while' loop", "while (i < 0)", 1, 0, 1, 13);
  }

  @Test
  void should_apply_quickfix_from_suggestions() throws Exception {
    var issues = analyze("foo.js", "if (!5 instanceof number) f()");
    assertThat(issues).hasSize(1);
    var issue = issues.get(0);
    assertThat(issue.getRuleKey()).isEqualTo("javascript:S3812");
    assertThat(issue.quickFixes()).hasSize(2);
    var quickFix1 = issue.quickFixes().get(0);
    assertQuickFix(
      quickFix1,
      "Negate 'instanceof' expression instead of its left operand. This changes the current behavior.",
      "(5 instanceof number)",
      1,
      5,
      1,
      24
    );
    var quickFix2 = issue.quickFixes().get(1);
    assertQuickFix(
      quickFix2,
      "Wrap negation in '()' to make the intention explicit. This preserves the current behavior.",
      "(!5)",
      1,
      4,
      1,
      6
    );
  }

  private void assertQuickFix(
    QuickFix quickFix,
    String message,
    String code,
    int line,
    int column,
    int endLine,
    int endColumn
  ) {
    assertThat(quickFix.message()).isEqualTo(message);
    assertThat(quickFix.inputFileEdits()).hasSize(1);
    var fileEdit = quickFix.inputFileEdits().get(0);
    assertThat(fileEdit.textEdits()).hasSize(1);
    var textEdit = fileEdit.textEdits().get(0);
    assertThat(textEdit.newText()).isEqualTo(code);
    assertThat(textEdit.range())
      .extracting(
        r -> r.getStartLine(),
        r -> r.getStartLineOffset(),
        r -> r.getEndLine(),
        r -> r.getEndLineOffset()
      )
      .containsExactly(line, column, endLine, endColumn);
  }

  private List<Issue> analyze(String filePath, String sourceCode) throws IOException {
    Path path = baseDir.resolve(filePath);
    Files.writeString(path, sourceCode, StandardCharsets.UTF_8);
    ClientInputFile inputFile = TestUtils.sonarLintInputFile(path, sourceCode);
    List<Issue> issues = new ArrayList<>();
    sonarlintEngine.analyze(
      StandaloneAnalysisConfiguration.builder().setBaseDir(baseDir).addInputFile(inputFile).build(),
      issues::add,
      null,
      null
    );
    return issues;
  }

  private StandaloneGlobalConfiguration getSonarLintConfig() throws IOException {
    NodeJsHelper nodeJsHelper = new NodeJsHelper();
    nodeJsHelper.detect(null);

    return getSonarLintConfig(nodeJsHelper.getNodeJsPath(), nodeJsHelper.getNodeJsVersion());
  }

  private StandaloneGlobalConfiguration getSonarLintConfig(Path nodePath, Version nodeVersion) {
    ClientLogOutput logOutput = (formattedMessage, level) -> {
      logs.add(formattedMessage);
      System.out.println(formattedMessage);
    };

    return StandaloneGlobalConfiguration.builder()
      .addEnabledLanguage(Language.JS)
      .addEnabledLanguage(Language.TS)
      .addEnabledLanguage(Language.CSS)
      .addPlugin(TestUtils.JAVASCRIPT_PLUGIN_LOCATION)
      .setSonarLintUserHome(sonarLintHome)
      .setLogOutput(logOutput)
      .setNodeJs(nodePath, nodeVersion)
      .build();
  }
}
