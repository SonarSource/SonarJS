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
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import org.junit.jupiter.api.Test;
import org.sonar.css.CssLanguage;

class CssNonStandardPathTest {

  private static final String PROJECT_KEY = "css-dir-with-paren";

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
    ScannerInput build = ScannerInput.create(
      PROJECT_KEY,
      TestUtils.projectDir("css-(dir with paren)")
    )
      .withScmDisabled()
      .withSourceDirs("src")
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
      .extracting(
        ScannerOutputReader.FileIssue::ruleKey,
        ScannerOutputReader.FileIssue::componentPath
      )
      .containsExactly(tuple("css:S1128", "src/file1.css"));
  }
}
