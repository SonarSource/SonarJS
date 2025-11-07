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
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.io.File;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class ExternalTSConfigDependencyTest {

  private static final String PROJECT = "external-tsconfig-dependency-project";
  private static final Path PROJECT_DIR = TestUtils.projectDirNoCopy(PROJECT);

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
    .withActiveRules(
      loadActiveRulesFromXmlProfile(
        Path.of("src", "test", "resources", "ts-eslint-based-rules.xml")
      )
    )
    .build();

  @Test
  void test() {
    ScannerInput build = ScannerInput.create(PROJECT, PROJECT_DIR).withScmDisabled().build();
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
      .containsExactlyInAnyOrder(tuple(4, "src/bar/main.ts"));
    assertThat(result.logOutput()).anyMatch(l ->
      l
        .message()
        .equals(
          "At least one referenced/extended tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details."
        )
    );

    File rootDrive = PROJECT_DIR.toFile();
    while (rootDrive.getParentFile() != null) {
      rootDrive = rootDrive.getParentFile();
    }

    File lastTsConfigPath = new File(
      rootDrive,
      "node_modules" + File.separator + "__missing__" + File.separator + "tsconfig.json"
    );

    assertThat(
      result
        .logOutput()
        .stream()
        .filter(l ->
          l
            .message()
            .equals(
              "Could not find tsconfig.json: " +
                lastTsConfigPath.getAbsolutePath().replace('\\', '/') +
                "; falling back to an empty configuration."
            )
        )
    ).hasSize(1);
  }
}
