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

import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;

class ProjectWithDifferentEncodingTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(JavaScriptLanguage.KEY),
    List.of(SonarScannerIntegrationHelper.getJavascriptPlugin()),
    List.of(Path.of("src", "test", "resources", "eslint-based-rules.xml"))
  );

  @Test
  void test() {
    String projectKey = "project-with-different-encoding";
    ScannerInput build = ScannerInput.create(projectKey, TestUtils.projectDir(projectKey))
      .withSourceEncoding("UTF-16")
      .withScmDisabled()
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());

    assertThat(result.logOutput())
      .extracting(Log::message)
      .doesNotContain("Failure during analysis");

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    assertThat(issues)
      .extracting(TextRangeIssue::line, TextRangeIssue::componentPath, TextRangeIssue::ruleKey)
      .containsExactly(tuple(2, "fileWithUtf16.js", "javascript:S3923"));
  }
}
