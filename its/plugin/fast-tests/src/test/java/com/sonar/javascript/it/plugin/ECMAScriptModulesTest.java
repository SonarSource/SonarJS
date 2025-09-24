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

import static com.sonarsource.scanner.integrationtester.utility.QualityProfileLoader.loadActiveRulesFromXmlProfile;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.nio.file.Path;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;

class ECMAScriptModulesTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestMasterBuild())
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withLanguage(
      JavaScriptLanguage.KEY,
      "JAVASCRIPT",
      JavaScriptLanguage.FILE_SUFFIXES_KEY,
      JavaScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withActiveRules(
      loadActiveRulesFromXmlProfile(Path.of("src", "test", "resources", "eslint-based-rules.xml"))
    )
    .build();

  @Test
  void test() {
    String projectKey = "esm-project";
    ScannerInput build = ScannerInput.create(projectKey, TestUtils.projectDir(projectKey).toPath())
      .withScmDisabled()
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    var issues = result.scannerOutputReader().getProject().getAllIssues();
    assertThat(issues).hasSize(1);
    assertThat(issues.get(0)).isInstanceOf(ScannerOutputReader.FileIssue.class);
    Assertions.assertThat(((ScannerOutputReader.FileIssue) issues.get(0)).line()).isEqualTo(2);
  }
}
