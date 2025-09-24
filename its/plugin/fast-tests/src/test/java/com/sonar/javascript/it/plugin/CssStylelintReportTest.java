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
package com.sonar.javascript.it.plugin;

import static org.assertj.core.api.Assertions.assertThat;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import org.junit.jupiter.api.Test;
import org.sonar.css.CssLanguage;

class CssStylelintReportTest {

  private static final String PROJECT_KEY = "css-external-report-project";

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestRelease())
    .withLanguage(
      CssLanguage.KEY,
      "CSS",
      CssLanguage.FILE_SUFFIXES_KEY,
      CssLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withActiveRules(SonarScannerIntegrationHelper.getAllCSSRules())
    .build();

  @Test
  void test() {
    ScannerInput build = ScannerInput.create(PROJECT_KEY, TestUtils.projectDir(PROJECT_KEY))
      .withSourceDirs("src")
      .withScmDisabled()
      .withScannerProperty("sonar.css.stylelint.reportPaths", "report.json")
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(ScannerOutputReader.FileIssue.class::isInstance)
      .map(ScannerOutputReader.FileIssue.class::cast)
      .toList();

    assertThat(issues)
      .extracting(ScannerOutputReader.FileIssue::line)
      .containsExactlyInAnyOrder(111, 81, 55, 58, 58, 114);
    assertThat(issues)
      .extracting(ScannerOutputReader.FileIssue::ruleKey)
      .containsExactlyInAnyOrder(
        "external_stylelint:no-missing-end-of-source-newline",
        "external_stylelint:no-missing-end-of-source-newline",
        "external_stylelint:rule-empty-line-before",
        "external_stylelint:selector-pseudo-element-colon-notation",
        "css:S4658",
        "external_stylelint:block-no-empty"
      );
  }
}
