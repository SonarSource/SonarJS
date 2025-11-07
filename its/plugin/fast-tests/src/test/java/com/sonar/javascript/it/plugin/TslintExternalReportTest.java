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

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class TslintExternalReportTest {

  private static final String PROJECT_KEY = "SonarJS-tslint-report-test";

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestMasterBuild())
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withLanguage(
      TypeScriptLanguage.KEY,
      "TYPESCRIPT",
      TypeScriptLanguage.FILE_SUFFIXES_KEY,
      TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .build();

  @Test
  void should_save_issues_from_external_report() {
    ScannerInput build = ScannerInput.create(
      PROJECT_KEY,
      TestUtils.projectDir("tslint-report-project")
    )
      .withSourceDirs("src")
      .withScmDisabled()
      .withScannerProperty("sonar.typescript.tslint.reportPaths", "report.json")
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.TextRangeIssue.class::isInstance)
      .map(ScannerOutputReader.TextRangeIssue.class::cast)
      .toList();

    assertThat(issues)
      .extracting(ScannerOutputReader.TextRangeIssue::line)
      .containsExactlyInAnyOrder(3, 5, 5, 7);
    assertThat(issues)
      .extracting(ScannerOutputReader.TextRangeIssue::ruleKey)
      .containsExactlyInAnyOrder(
        "external_tslint_repo:no-unused-expression",
        "external_tslint_repo:prefer-const",
        "external_tslint_repo:semicolon",
        "external_tslint_repo:curly"
      );
  }
}
