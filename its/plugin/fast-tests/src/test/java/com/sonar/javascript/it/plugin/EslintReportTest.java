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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.Issue;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class EslintReportTest {

  private static final String PROJECT_KEY_PREFIX = "SonarJS-eslint-report-test";
  private static final Path PROJECT_DIR = TestUtils.projectDir("eslint_report");

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(SonarScannerIntegrationHelper.getEngineVersion())
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withLanguage(
      TypeScriptLanguage.KEY,
      "TYPESCRIPT",
      TypeScriptLanguage.FILE_SUFFIXES_KEY,
      TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withLanguage(
      JavaScriptLanguage.KEY,
      "JAVASCRIPT",
      JavaScriptLanguage.FILE_SUFFIXES_KEY,
      JavaScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .build();

  @Test
  void should_save_issues_from_external_report_with_relative_paths() {
    String projectKey = PROJECT_KEY_PREFIX + "-relative";
    ScannerInput build = ScannerInput.create(projectKey, PROJECT_DIR)
      .withSourceDirs("src")
      .withScmDisabled()
      .withScannerProperty("sonar.eslint.reportPaths", "report.json")
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());
    try {
      assertIssues(result.scannerOutputReader().getProject().getAllIssues());
    } catch (UnsupportedOperationException e) {
      System.out.print(e.toString());
    }
  }

  @Test
  void should_save_issues_from_external_report_with_absolute_paths() throws IOException {
    File reportWithRelativePaths = new File(PROJECT_DIR.toFile(), "report.json");
    File reportWithAbsolutePaths = new File(PROJECT_DIR.toFile(), "report_absolute_paths.json");
    createReportWithAbsolutePaths(reportWithRelativePaths, reportWithAbsolutePaths);

    String projectKey = PROJECT_KEY_PREFIX + "-absolute";
    ScannerInput build = ScannerInput.create(projectKey, PROJECT_DIR)
      .withSourceDirs("src")
      .withScmDisabled()
      .withScannerProperty("sonar.eslint.reportPaths", reportWithAbsolutePaths.getAbsolutePath())
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());
    assertIssues(result.scannerOutputReader().getProject().getAllIssues());

    Files.delete(reportWithAbsolutePaths.toPath());
  }

  private void assertIssues(List<Issue> issues) {
    var TextRangeIssues = issues
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    List<TextRangeIssue> jsIssuesList = TextRangeIssues.stream()
      .filter(issue -> issue.componentPath().equals("src/file.js"))
      .toList();
    List<TextRangeIssue> tsIssuesList = TextRangeIssues.stream()
      .filter(issue -> issue.componentPath().equals("src/file.ts"))
      .toList();

    assertThat(jsIssuesList)
      .extracting(TextRangeIssue::line, TextRangeIssue::ruleKey)
      .containsExactlyInAnyOrder(
        tuple(1, "external_eslint_repo:@typescript-eslint/no-unused-vars"),
        tuple(2, "external_eslint_repo:use-isnan"),
        tuple(3, "external_eslint_repo:semi"),
        tuple(5, "external_eslint_repo:semi"),
        tuple(7, "external_eslint_repo:no-extra-semi")
      );

    assertThat(tsIssuesList)
      .extracting(TextRangeIssue::line, TextRangeIssue::ruleKey)
      .containsExactlyInAnyOrder(
        tuple(1, "external_eslint_repo:@typescript-eslint/no-unused-vars"),
        tuple(2, "external_eslint_repo:use-isnan"),
        tuple(3, "external_eslint_repo:semi"),
        tuple(5, "external_eslint_repo:semi"),
        tuple(7, "external_eslint_repo:no-extra-semi")
      );
  }

  private void createReportWithAbsolutePaths(
    File reportWithRelativePaths,
    File reportWithAbsolutePaths
  ) throws IOException {
    List<String> reportContent = Files.readAllLines(reportWithRelativePaths.toPath());
    String prefix = "\"filePath\": \"";
    List<String> transformed = reportContent
      .stream()
      .map(s -> {
        if (s.contains(prefix)) {
          File file = new File(
            PROJECT_DIR.toFile(),
            "src/file." + (s.contains(".js") ? "js" : "ts")
          );
          String absolutePath = file.getAbsolutePath();
          if (System.getProperty("os.name").startsWith("Windows")) {
            // FIXME https://sonarsource.atlassian.net/browse/JS-747 import of ESLint report with absolute path containing lower-case drive letter does not work for SQ Developer Edition and above
            // try to "break" file resolution (see https://github.com/SonarSource/SonarJS/issues/1985) by low-casing drive letter
            //absolutePath = absolutePath.substring(0, 1).toLowerCase() + absolutePath.substring(1);
            absolutePath = absolutePath.replace("\\", "\\\\");
          }
          return prefix + absolutePath + "\",";
        } else {
          return s;
        }
      })
      .collect(Collectors.toList());
    Files.write(reportWithAbsolutePaths.toPath(), transformed);
  }
}
