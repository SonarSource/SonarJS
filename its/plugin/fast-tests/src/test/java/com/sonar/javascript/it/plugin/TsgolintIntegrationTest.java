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
import static org.assertj.core.api.Assertions.assertThat;

import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarProjectContext;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.TypeScriptLanguage;

/**
 * Integration test verifying that the 7 tsgolint-offloaded rules produce
 * issues when analyzing TypeScript files.
 */
class TsgolintIntegrationTest {

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
    .withProjectContext(
      SonarProjectContext.builder()
        .withActiveRules(
          loadActiveRulesFromXmlProfile(Path.of("src", "test", "resources", "tsgolint-rules.xml"))
        )
        .build()
    )
    .build();

  @Test
  void tsgolint_rules_produce_issues() {
    String projectKey = "tsgolint-test";
    var projectDir = TestUtils.projectDir(projectKey);
    ScannerInput build = ScannerInput.create(projectKey, projectDir)
      .withScmDisabled()
      .withVerbose()
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());

    assertThat(result.exitCode()).isEqualTo(0);
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
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();

    // Verify all 7 rules produced at least one issue
    assertThat(issues)
      .extracting(TextRangeIssue::ruleKey)
      .contains(
        "typescript:S4123", // await-thenable
        "typescript:S2933", // prefer-readonly
        "typescript:S4157", // no-unnecessary-type-arguments
        "typescript:S4325", // no-unnecessary-type-assertion
        "typescript:S6565", // prefer-return-this-type
        "typescript:S6583", // no-mixed-enums
        "typescript:S6671" // prefer-promise-reject-errors
      );

    // Verify correct file associations
    assertThat(issues)
      .filteredOn(i -> i.ruleKey().equals("typescript:S4123"))
      .extracting(TextRangeIssue::componentPath)
      .containsExactly("await-thenable.ts");

    assertThat(issues)
      .filteredOn(i -> i.ruleKey().equals("typescript:S2933"))
      .extracting(TextRangeIssue::componentPath)
      .containsExactly("prefer-readonly.ts");
  }
}
