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

import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class WebSensorMultiModuleTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(TypeScriptLanguage.KEY),
    List.of(SonarScannerIntegrationHelper.getJavascriptPlugin()),
    List.of(Path.of("src", "test", "resources", "typechecker-config-ts.xml"))
  );

  private static final String PROJECT_KEY = "SonarJS-websensor-multi-module";
  private static final Path PROJECT_DIR = TestUtils.projectDir("websensor-multi-module");

  @Test
  void should_collect_module_relative_paths_and_analyze_once() {
    ScannerInput build = ScannerInput.create(PROJECT_KEY, PROJECT_DIR)
      .withScmDisabled()
      .withScannerProperty("sonar.modules", "moduleA,moduleB")
      .withScannerProperty("sonar.exclusions", "**")
      .withScannerProperty("moduleA.sonar.projectBaseDir", "moduleA")
      .withScannerProperty("moduleA.sonar.sources", "src")
      .withScannerProperty("moduleA.sonar.exclusions", "")
      .withScannerProperty("moduleA.sonar.typescript.tsconfigPaths", "../tsconfig.shared.json")
      .withScannerProperty("moduleA.sonar.eslint.reportPaths", "report.json")
      .withScannerProperty("moduleB.sonar.projectBaseDir", "moduleB")
      .withScannerProperty("moduleB.sonar.sources", "src")
      .withScannerProperty("moduleB.sonar.exclusions", "")
      .withScannerProperty("moduleB.sonar.typescript.tsconfigPaths", "../tsconfig.shared.json")
      .withScannerProperty("moduleB.sonar.eslint.reportPaths", "report.json")
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());
    assertThat(result.logOutput())
      .extracting(Log::message)
      .filteredOn(message -> message.startsWith("Found 1 tsconfig.json file(s)"))
      .hasSize(1);
    assertThat(result.logOutput())
      .filteredOn(
        log ->
          log.level().equals(Log.Level.INFO) &&
          log.message().startsWith("Analyzing 2 file(s) from tsconfig")
      )
      .hasSize(1);

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();

    assertThat(issues)
      .extracting(TextRangeIssue::componentPath, TextRangeIssue::ruleKey, TextRangeIssue::line)
      .containsExactlyInAnyOrder(
        tuple("moduleA/src/main.ts", "typescript:S3003", 4),
        tuple("moduleA/src/main.ts", "external_eslint_repo:semi", 4),
        tuple("moduleB/src/main.ts", "typescript:S3003", 4),
        tuple("moduleB/src/main.ts", "external_eslint_repo:semi", 4)
      );
  }

  @Test
  void should_merge_project_and_module_tsconfig_paths_and_eslint_reports() {
    ScannerInput build = ScannerInput.create(PROJECT_KEY, PROJECT_DIR)
      .withScmDisabled()
      .withScannerProperty("sonar.modules", "moduleA,moduleB")
      .withScannerProperty("sonar.exclusions", "**")
      .withScannerProperty("sonar.typescript.tsconfigPaths", "tsconfig.moduleA.json")
      .withScannerProperty("sonar.eslint.reportPaths", "root-report.json")
      .withScannerProperty("moduleA.sonar.projectBaseDir", "moduleA")
      .withScannerProperty("moduleA.sonar.sources", "src")
      .withScannerProperty("moduleA.sonar.exclusions", "")
      .withScannerProperty("moduleB.sonar.projectBaseDir", "moduleB")
      .withScannerProperty("moduleB.sonar.sources", "src")
      .withScannerProperty("moduleB.sonar.exclusions", "")
      .withScannerProperty("moduleB.sonar.typescript.tsconfigPaths", "../tsconfig.moduleB.json")
      .withScannerProperty("moduleB.sonar.eslint.reportPaths", "report.json")
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());
    assertThat(result.logOutput())
      .extracting(Log::message)
      .filteredOn(message -> message.startsWith("Found 2 tsconfig.json file(s)"))
      .hasSize(1);
    assertThat(result.logOutput())
      .filteredOn(
        log ->
          log.level().equals(Log.Level.INFO) &&
          log.message().startsWith("Analyzing 1 file(s) from tsconfig")
      )
      .hasSize(2);

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();

    assertThat(issues)
      .extracting(TextRangeIssue::componentPath, TextRangeIssue::ruleKey, TextRangeIssue::line)
      .containsExactlyInAnyOrder(
        tuple("moduleA/src/main.ts", "typescript:S3003", 4),
        tuple("moduleA/src/main.ts", "external_eslint_repo:use-isnan", 4),
        tuple("moduleB/src/main.ts", "typescript:S3003", 4),
        tuple("moduleB/src/main.ts", "external_eslint_repo:semi", 4)
      );
  }
}
