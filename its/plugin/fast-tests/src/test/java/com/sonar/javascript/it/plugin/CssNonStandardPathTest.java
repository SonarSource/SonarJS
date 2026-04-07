/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import com.sonarsource.scanner.integrationtester.dsl.SonarProjectContext;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import org.junit.jupiter.api.Test;
import org.sonar.css.CssLanguage;

class CssNonStandardPathTest {

  private static final String PROJECT_KEY = "css-dir-with-paren";

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(SonarScannerIntegrationHelper.getEngineVersion())
    .withLanguage(
      CssLanguage.KEY,
      "CSS",
      CssLanguage.FILE_SUFFIXES_KEY,
      CssLanguage.DEFAULT_FILE_SUFFIXES
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
    ScannerInput build = ScannerInput.create(
      PROJECT_KEY,
      TestUtils.projectDir("css-(dir with paren)")
    )
      .withScmDisabled()
      .withSourceDirs("src")
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    assertThat(issues)
      .extracting(TextRangeIssue::ruleKey, TextRangeIssue::componentPath)
      .containsExactly(tuple("css:S1128", "src/file1.css"));
  }
}
