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

import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptPlugin;
import org.sonar.plugins.javascript.TypeScriptLanguage;

/**
 * Integration tests for the {@code sonar.javascript.disableTypeChecking} flag.
 * Uses a project with a tsconfig.json to verify that even tsconfig-based
 * program creation is skipped when type checking is disabled.
 * The fixture triggers S3003 (strings-comparison) which requires type information
 * to detect that both operands are strings.
 */
class DisableTypeCheckingTest {

  private static final String PROJECT_NAME = "disable-type-checking";

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(TypeScriptLanguage.KEY),
    List.of(SonarScannerIntegrationHelper.getJavascriptPlugin()),
    List.of(Path.of("src", "test", "resources", "disable-type-checking.xml"))
  );

  @Test
  void should_find_type_aware_issue_by_default() {
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      getScanner().build(),
      ScannerRunnerConfig.builder().build()
    );

    // Should create a TypeScript program from tsconfig
    assertThat(result.logOutput())
      .extracting(Log::message)
      .anyMatch(m -> m.contains("Creating TypeScript"));

    // Should NOT log the disableTypeChecking message
    assertThat(result.logOutput())
      .extracting(Log::message)
      .noneMatch(m -> m.contains("Type checking is disabled"));

    // S3003 requires type info: with TS program, the issue should be found
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    assertThat(issues).hasSize(1);
    assertThat(issues.get(0).line()).isEqualTo(2);
  }

  @Test
  void should_not_find_type_aware_issue_when_type_checking_disabled() {
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      getScanner().withScannerProperty(JavaScriptPlugin.DISABLE_TYPE_CHECKING, "true").build(),
      ScannerRunnerConfig.builder().build()
    );

    // Should log that type checking is disabled
    assertThat(result.logOutput())
      .extracting(Log::message)
      .anyMatch(m -> m.contains("Type checking is disabled"));

    // Should NOT create a TypeScript program
    assertThat(result.logOutput())
      .extracting(Log::message)
      .noneMatch(m -> m.contains("Creating TypeScript"));

    // S3003 requires type info: without TS program, no issue should be found
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    assertThat(issues).isEmpty();
  }

  private static ScannerInput.Builder getScanner() {
    return ScannerInput.create(PROJECT_NAME, TestUtils.projectDir(PROJECT_NAME)).withScmDisabled();
  }
}
