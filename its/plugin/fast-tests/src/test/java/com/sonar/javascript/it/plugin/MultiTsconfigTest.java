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
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class MultiTsconfigTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(TypeScriptLanguage.KEY),
    List.of(SonarScannerIntegrationHelper.getJavascriptPlugin()),
    List.of(Path.of("src", "test", "resources", "ts-eslint-based-rules.xml"))
  );

  private static final String PROJECT = "multi-tsconfig-test-project";
  private static final Path PROJECT_DIR = TestUtils.projectDir(PROJECT);

  @Test
  void test() {
    ScannerInput build = ScannerInput.create(PROJECT, PROJECT_DIR)
      // setting inclusions like this will exclude tsconfig.json files, which is what we want to test
      .withScannerProperty("sonar.inclusions", "**/*.ts")
      .withScmDisabled()
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
      .extracting(
        ScannerOutputReader.TextRangeIssue::line,
        ScannerOutputReader.TextRangeIssue::componentPath
      )
      .containsExactlyInAnyOrder(
        tuple(4, "src/bar/main.ts"),
        tuple(3, "src/dir1/main.ts"),
        tuple(3, "src/dir2/main.ts"),
        tuple(3, "src/foo/main.ts"),
        // following are detected because we analyze files not included in tsconfig
        tuple(4, "src/bar/excluded/main.ts"),
        tuple(4, "src/excluded/main.ts")
      );
  }
}
