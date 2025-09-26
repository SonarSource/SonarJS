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

import static com.sonar.javascript.it.plugin.SonarScannerIntegrationHelper.getAllCSSRules;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import org.junit.jupiter.api.Test;

class CssNoCssFileProjectTest {

  private static final String PROJECT_KEY = "css-html-project";

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestRelease())
    .withLanguage("web", "HTML", "sonar.html.file.suffixes", ".html")
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withActiveRules(getAllCSSRules())
    .build();

  @Test
  void test() {
    ScannerInput build = ScannerInput.create(
      PROJECT_KEY,
      TestUtils.projectDir(PROJECT_KEY).toPath()
    )
      .withSourceDirs("src")
      .withScmDisabled()
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
        ScannerOutputReader.FileIssue::line,
        ScannerOutputReader.FileIssue::componentPath
      )
      .containsExactlyInAnyOrder(tuple("css:S4658", 7, "src/index.html"));
  }
}
