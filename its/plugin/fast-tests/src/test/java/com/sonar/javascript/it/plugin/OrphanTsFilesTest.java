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
 * Integration tests for the {@code sonar.javascript.createTSProgramForOrphanFiles} flag.
 * Uses a project with no tsconfig.json so all files are orphans.
 * The fixture triggers S3003 (strings-comparison) which requires type information
 * to detect that both operands are strings.
 */
class OrphanTsFilesTest {

  private static final String PROJECT_NAME = "orphan-ts-files";

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(TypeScriptLanguage.KEY),
    List.of(SonarScannerIntegrationHelper.getJavascriptPlugin()),
    List.of(Path.of("src", "test", "resources", "orphan-files-ts.xml"))
  );

  @Test
  void should_find_type_aware_issue_with_ts_program_by_default() {
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      getScanner().build(),
      ScannerRunnerConfig.builder().build()
    );

    // Should analyze with a TypeScript program (default behavior)
    assertThat(result.logOutput())
      .extracting(Log::message)
      .anyMatch(m -> m.contains("using default options"));

    // Should NOT log skipping message
    assertThat(result.logOutput())
      .extracting(Log::message)
      .noneMatch(m -> m.contains("Skipping TypeScript program creation for"));

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
  void should_not_find_type_aware_issue_when_flag_is_false() {
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      getScanner()
        .withScannerProperty(JavaScriptPlugin.CREATE_TS_PROGRAM_FOR_ORPHAN_FILES, "false")
        .build(),
      ScannerRunnerConfig.builder().build()
    );

    // Should log that TS program creation is skipped
    assertThat(result.logOutput())
      .extracting(Log::message)
      .anyMatch(m -> m.contains("Skipping TypeScript program creation for"));

    // Should log that files are analyzed without type information
    assertThat(result.logOutput())
      .extracting(Log::message)
      .anyMatch(m -> m.contains("not part of any tsconfig.json"));

    // Should NOT create a TS program with default options
    assertThat(result.logOutput())
      .extracting(Log::message)
      .noneMatch(m -> m.contains("using default options"));

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
