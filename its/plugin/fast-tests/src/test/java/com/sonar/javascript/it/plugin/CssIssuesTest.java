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
import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerResult;
import com.sonarsource.scanner.integrationtester.dsl.SonarProjectContext;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.sonar.css.CssLanguage;
import org.sonar.plugins.javascript.JavaScriptLanguage;

class CssIssuesTest {

  private static final String PROJECT_KEY = "css-issues-project";

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(SonarScannerIntegrationHelper.getEngineVersion())
    .withLanguage(
      CssLanguage.KEY,
      "CSS",
      CssLanguage.FILE_SUFFIXES_KEY,
      CssLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withLanguage(
      JavaScriptLanguage.KEY,
      "JAVASCRIPT",
      JavaScriptLanguage.FILE_SUFFIXES_KEY,
      JavaScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withProjectContext(
      SonarProjectContext.builder()
        .withActiveRules(SonarScannerIntegrationHelper.getAllCSSRules())
        .build()
    )
    .build();

  @Test
  void test() {
    ScannerInput build = ScannerInput.create(PROJECT_KEY, Path.of("..", "projects", PROJECT_KEY))
      .withSourceDirs("src")
      .withScannerProperty("sonar.exclusions", "**/file-with-parsing-error-excluded.css")
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());
    checkIssues(result);
    parsingErrorsNotExcluded(result);
  }

  void parsingErrorsNotExcluded(ScannerResult result) {
    assertThat(
      result
        .logOutput()
        .stream()
        .anyMatch(
          s ->
            s
              .message()
              .matches(
                "Failed to parse file file:\\S*file-with-parsing-error\\.css, line 1, Unclosed block.*"
              ) &&
            s.level() == Log.Level.WARN
        )
    ).isTrue();
    assertThat(result.logOutput().stream()).noneSatisfy(s ->
      assertThat(s.message()).matches(
        "(?s).*WARN: Failed to parse file file:\\S*file-with-parsing-error-excluded\\.css.*"
      )
    );
  }

  void checkIssues(ScannerResult result) {
    var issuesList = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();

    assertThat(issuesList)
      .extracting(TextRangeIssue::ruleKey, TextRangeIssue::componentPath)
      .containsExactlyInAnyOrder(
        tuple("css:S4662", "src/cssModules.css"),
        tuple("css:S7924", "src/cssModules.css"),
        tuple("css:S4667", "src/empty1.css"),
        tuple("css:S4667", "src/empty2.less"),
        tuple("css:S4667", "src/empty3.scss"),
        tuple("css:S4667", "src/emptySass.vue"),
        tuple("css:S1128", "src/file1.css"),
        tuple("css:S1116", "src/file1.css"),
        tuple("css:S4664", "src/file1.css"),
        tuple("css:S4660", "src/file1.css"),
        tuple("css:S4659", "src/file1.css"),
        tuple("css:S4647", "src/file1.css"),
        tuple("css:S4663", "src/file1.css"),
        tuple("css:S4652", "src/file1.css"),
        tuple("css:S4656", "src/file1.css"),
        tuple("css:S4649", "src/file1.css"),
        tuple("css:S4648", "src/file1.css"),
        tuple("css:S4654", "src/file1.css"),
        tuple("css:S4657", "src/file1.css"),
        tuple("css:S4650", "src/file1.css"),
        tuple("css:S4650", "src/file1.css"),
        tuple("css:S4668", "src/file1.css"),
        tuple("css:S4651", "src/file1.css"),
        tuple("css:S4666", "src/file1.css"),
        tuple("css:S4670", "src/file1.css"),
        tuple("css:S4662", "src/file1.css"),
        tuple("css:S4655", "src/file1.css"),
        tuple("css:S4658", "src/file1.css"),
        tuple("css:S4661", "src/file1.css"),
        tuple("css:S1128", "src/file2.less"),
        tuple("css:S1116", "src/file2.less"),
        tuple("css:S4664", "src/file2.less"),
        tuple("css:S4660", "src/file2.less"),
        tuple("css:S4659", "src/file2.less"),
        tuple("css:S4647", "src/file2.less"),
        tuple("css:S4663", "src/file2.less"),
        tuple("css:S4652", "src/file2.less"),
        tuple("css:S4656", "src/file2.less"),
        tuple("css:S4649", "src/file2.less"),
        tuple("css:S4648", "src/file2.less"),
        tuple("css:S4654", "src/file2.less"),
        tuple("css:S4657", "src/file2.less"),
        tuple("css:S4650", "src/file2.less"),
        tuple("css:S4650", "src/file2.less"),
        tuple("css:S4651", "src/file2.less"),
        tuple("css:S4666", "src/file2.less"),
        tuple("css:S4670", "src/file2.less"),
        tuple("css:S4662", "src/file2.less"),
        tuple("css:S4655", "src/file2.less"),
        tuple("css:S4658", "src/file2.less"),
        tuple("css:S4661", "src/file2.less"),
        tuple("css:S1128", "src/file3.scss"),
        tuple("css:S1116", "src/file3.scss"),
        tuple("css:S4664", "src/file3.scss"),
        tuple("css:S4660", "src/file3.scss"),
        tuple("css:S4659", "src/file3.scss"),
        tuple("css:S4647", "src/file3.scss"),
        tuple("css:S4663", "src/file3.scss"),
        tuple("css:S4652", "src/file3.scss"),
        tuple("css:S4656", "src/file3.scss"),
        tuple("css:S4649", "src/file3.scss"),
        tuple("css:S4648", "src/file3.scss"),
        tuple("css:S4654", "src/file3.scss"),
        tuple("css:S4657", "src/file3.scss"),
        tuple("css:S4650", "src/file3.scss"),
        tuple("css:S4650", "src/file3.scss"),
        tuple("css:S4651", "src/file3.scss"),
        tuple("css:S4666", "src/file3.scss"),
        tuple("css:S4670", "src/file3.scss"),
        tuple("css:S4662", "src/file3.scss"),
        tuple("css:S4655", "src/file3.scss"),
        tuple("css:S4658", "src/file3.scss"),
        tuple("css:S4661", "src/file3.scss"),
        tuple("css:S1116", "src/file5.htm"),
        tuple("css:S1116", "src/file6.vue"),
        tuple("css:S5362", "src/file1.css"),
        tuple("css:S5362", "src/file2.less"),
        tuple("css:S5362", "src/file3.scss"),
        tuple("css:S1116", "src/file5-1.html"),
        tuple("css:S125", "src/file2.less")
      );
  }
}
