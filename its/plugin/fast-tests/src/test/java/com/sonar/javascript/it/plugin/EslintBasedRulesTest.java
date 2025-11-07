/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
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
package com.sonar.javascript.it.plugin;

import static com.sonarsource.scanner.integrationtester.utility.QualityProfileLoader.loadActiveRulesFromXmlProfile;
import static java.util.Collections.emptySet;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.regex.Pattern;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class EslintBasedRulesTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestMasterBuild())
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withLanguage(
      JavaScriptLanguage.KEY,
      "JAVASCRIPT",
      JavaScriptLanguage.FILE_SUFFIXES_KEY,
      JavaScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withLanguage(
      TypeScriptLanguage.KEY,
      "TYPESCRIPT",
      TypeScriptLanguage.FILE_SUFFIXES_KEY,
      TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withActiveRules(
      loadActiveRulesFromXmlProfile(Path.of("src", "test", "resources", "eslint-based-rules.xml"))
    )
    .withActiveRules(
      loadActiveRulesFromXmlProfile(
        Path.of("src", "test", "resources", "ts-eslint-based-rules.xml")
      )
    )
    .build();

  @Test
  void test_without_ts() {
    testProject(TestUtils.projectDir("eslint_based_rules"), "eslint-based-rules-project");
  }

  @Test
  void test_with_ts() {
    // When project contains both JS and TS, ts dependency will be available, therefore @typescript-eslint/eslint-plugin
    // rules will also be available, causing potential conflicts.
    var projectDir = TestUtils.projectDir("eslint_based_rules_with_ts");
    testProject(projectDir, "eslint-based-rules-project-with-ts");
  }

  public void testProject(Path projectDir, String projectKey) {
    ScannerInput build = ScannerInput.create(projectKey, projectDir)
      .withScmDisabled()
      .withVerbose()
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);

    assertThat(
      result
        .logOutput()
        .stream()
        .filter(l -> l.level().equals(Log.Level.ERROR))
    ).isEmpty();
    // assert that there are no logs from Apache HttpClient
    assertThat(
      result
        .logOutput()
        .stream()
        .filter(l -> l.message().contains("preparing request execution"))
    ).isEmpty();

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .filter(issue -> issue.ruleKey().equals("javascript:S3923"))
      .toList();
    assertThat(issues).hasSize(1);
    Assertions.assertThat(issues.get(0).line()).isEqualTo(1);
  }

  @Test
  void test_directory_with_special_chars() {
    String projectKey = "special-chars";
    ScannerInput build = ScannerInput.create(
      projectKey,
      TestUtils.projectDirNoCopy("(dir with paren)/eslint_based_rules")
    )
      .withScmDisabled()
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .filter(issue -> issue.ruleKey().equals("javascript:S3923"))
      .toList();
    assertThat(issues).hasSize(1);
    Assertions.assertThat(issues.get(0).line()).isEqualTo(5);
  }

  @Test
  void test_js_with_ts_eslint_parser() {
    String projectKey = "js-with-ts-eslint-key";
    ScannerInput build = ScannerInput.create(
      projectKey,
      TestUtils.projectDir("js-with-ts-eslint-project")
    )
      .withScmDisabled()
      .build();
    var result = ScannerRunner.run(getServerContext("js-with-ts-eslint-profile.xml"), build);
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .filter(issue -> issue.ruleKey().equals("javascript:S3525"))
      .toList();

    assertThat(issues).hasSize(1);
    Assertions.assertThat(issues.get(0).line()).isEqualTo(2);
  }

  @Test
  void test_exclusion_filter() {
    String projectKey = "file-filter-project";
    ScannerInput build = ScannerInput.create(
      projectKey,
      TestUtils.projectDirNoCopy("file-filter/excluded_dir/project")
    )
      .withScmDisabled()
      .withScannerProperty("sonar.javascript.exclusions", "excluded_dir/**,**/node_modules")
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    assertThat(
      result
        .logOutput()
        .stream()
        .filter(l -> l.level().equals(Log.Level.ERROR))
    ).isEmpty();

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .filter(issue -> issue.ruleKey().equals("javascript:S3923"))
      .toList();
    assertThat(issues)
      .hasSize(1)
      .extracting(ScannerOutputReader.TextRangeIssue::componentPath)
      .containsExactly("main.js");
  }

  @Test
  void should_not_use_node_in_cwd() throws Exception {
    // cwd - current working directory
    if (!System.getProperty("os.name").startsWith("Windows")) {
      // this test only makes sense on Windows
      return;
    }
    String projectKey = "eslint_based_rules";
    var projectDir = TestUtils.projectDir(projectKey);
    ScannerInput build = ScannerInput.create(projectKey, projectDir)
      .withVerbose()
      .withScmDisabled()
      .withScannerProperty("sonar.nodejs.forceHost", "true")
      .build();

    // copy ping.exe to node.exe and place it in the project directory
    Path ping = Paths.get("C:\\Windows\\System32\\PING.EXE");
    Path fakeNodePath = projectDir.resolve("node.exe");
    Files.copy(ping, fakeNodePath, StandardCopyOption.REPLACE_EXISTING);

    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    assertThat(result.exitCode()).isEqualTo(0);
    assertThat(result.logOutput())
      .extracting(Log::message)
      .contains("Looking for Node.js in the PATH using where.exe (Windows)");

    // compare that the node which we used is not "ping.exe"
    String log = result
      .logOutput()
      .stream()
      .filter(s -> s.message().contains("Found node.exe at"))
      .findFirst()
      .get()
      .message();
    Path nodePath = Paths.get(log.substring(log.indexOf("at") + 3));
    assertThat(nodePath).isNotEqualTo(fakeNodePath);
    byte[] nodeBytes = Files.readAllBytes(nodePath);
    byte[] pingBytes = Files.readAllBytes(ping);
    assertThat(pingBytes).isNotEqualTo(nodeBytes);
  }

  @Test
  void quickfix() {
    var projectKey = "quickfix";
    var projectDir = TestUtils.projectDir(projectKey);
    ScannerInput build = ScannerInput.create(projectKey, projectDir).withScmDisabled().build();
    var result = ScannerRunner.run(getServerContext("no-empty-statement.xml"), build);
    assertThat(
      result
        .logOutput()
        .stream()
        .filter(l -> l.level().equals(Log.Level.ERROR))
    ).isEmpty();

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .filter(issue -> issue.ruleKey().equals("javascript:S1116"))
      .toList();
    assertThat(issues).hasSize(1);
    var issue = issues.get(0);
    assertThat(issue.line()).isEqualTo(2);
    // TODO: Update when framework allows for checking quickfixes
    //    assertThat(issue.hasQuickfix()).isTrue();
  }

  @Test
  void jsFileNamedAsTsFile() {
    var projectKey = "same-filename";
    var projectDir = TestUtils.projectDir(projectKey);
    ScannerInput build = ScannerInput.create(projectKey, projectDir)
      .withVerbose()
      .withScmDisabled()
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);

    assertThat(
      result
        .logOutput()
        .stream()
        .filter(
          l ->
            l.message().contains("Failed to parse") &&
            l.message().contains("with TypeScript parser")
        )
    ).isEmpty();

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .toList();
    assertThat(issues)
      .extracting(
        ScannerOutputReader.TextRangeIssue::ruleKey,
        ScannerOutputReader.TextRangeIssue::componentPath
      )
      .containsExactlyInAnyOrder(
        tuple("javascript:S3403", "file.js"), // rule requires type information
        tuple("javascript:S3923", "file.js"), // rule does not require type information
        tuple("typescript:S3923", "file.ts")
      );
  }

  @Test
  void should_log_memory_config() {
    var projectKey = "eslint_based_rules";
    var projectDir = TestUtils.projectDir(projectKey);
    var build = ScannerInput.create(projectKey, projectDir)
      .withScannerProperty("sonar.javascript.node.maxspace", "500000")
      .withScannerProperty("sonar.javascript.node.debugMemory", "true")
      .withVerbose()
      .withScmDisabled()
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    assertThat(result.exitCode()).isEqualTo(0);
    assertThat(result.logOutput())
      .extracting(Log::message)
      .contains("Configured Node.js --max-old-space-size=500000.");
    var osMem = Pattern.compile(".*Memory configuration: OS \\(\\d+ MB\\),.*", Pattern.DOTALL);
    assertThat(result.logOutput()).extracting(Log::message).anyMatch(osMem.asMatchPredicate());
    var warn = Pattern.compile(
      "Node.js heap size limit \\d+ is higher than available memory \\d+. Check your configuration of sonar\\.javascript\\.node\\.maxspace.*",
      Pattern.DOTALL
    );
    assertThat(result.logOutput()).extracting(Log::message).anyMatch(warn.asMatchPredicate());
    assertThat(result.logOutput())
      .extracting(Log::message)
      .anySatisfy(l -> assertThat(l).contains("used_heap_size"));
  }

  private SonarServerContext getServerContext(String xml) {
    return SonarServerContext.builder()
      .withProduct(SonarServerContext.Product.SERVER)
      .withEngineVersion(EngineVersion.latestMasterBuild())
      .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
      .withLanguage(
        JavaScriptLanguage.KEY,
        "JAVASCRIPT",
        JavaScriptLanguage.FILE_SUFFIXES_KEY,
        JavaScriptLanguage.DEFAULT_FILE_SUFFIXES
      )
      .withLanguage(
        TypeScriptLanguage.KEY,
        "TYPESCRIPT",
        TypeScriptLanguage.FILE_SUFFIXES_KEY,
        TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
      )
      .withActiveRules(loadActiveRulesFromXmlProfile(Path.of("src", "test", "resources", xml)))
      .build();
  }
}
