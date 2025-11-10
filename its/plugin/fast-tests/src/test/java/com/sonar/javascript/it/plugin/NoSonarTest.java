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

import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;

class NoSonarTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(JavaScriptLanguage.KEY),
    List.of(SonarScannerIntegrationHelper.getJavascriptPlugin()),
    List.of(Path.of("src", "test", "resources", "nosonar.xml"))
  );

  private static final Path PROJECT_DIR = TestUtils.projectDir("nosonar");

  @Test
  void test() {
    String projectKey = "nosonar-project";

    ScannerInput build = ScannerInput.create(projectKey, PROJECT_DIR).withScmDisabled().build();

    var issues = ScannerRunner.run(SERVER_CONTEXT, build)
      .scannerOutputReader()
      .getProject()
      .getAllIssues();
    assertThat(issues).hasSize(1);
    assertThat(issues.get(0).ruleKey()).isEqualTo("javascript:S1116");
  }
}
