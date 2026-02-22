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
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class YamlAnalysisTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of("yaml"),
    List.of(
      SonarScannerIntegrationHelper.getJavascriptPlugin(),
      SonarScannerIntegrationHelper.getYamlPlugin()
    ),
    List.of(Path.of("src", "test", "resources", "eslint-based-rules.xml"))
  );

  @Test
  void single_line_inline_aws_lambda_for_js() {
    var projectKey = "yaml-aws-lambda-analyzed";

    ScannerInput build = ScannerInput.create(projectKey, TestUtils.projectDir(projectKey))
      .withScmDisabled()
      .withVerbose()
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());

    assertThat(
      result
        .scannerOutputReader()
        .getProject()
        .getAllIssues()
        .stream()
        .filter(TextRangeIssue.class::isInstance)
        .map(TextRangeIssue.class::cast)
    ).anySatisfy(issue ->
      assertThat(issue.line() == 12 && issue.ruleKey().equals("javascript:S3923"))
    );
    assertThat(result.logOutput()).anySatisfy(log ->
      assertThat(log.message()).startsWith("Creating Node.js process")
    );
  }

  @Test
  void dont_start_eslint_bridge_for_yaml_without_nodejs_aws() {
    var projectKey = "yaml-aws-lambda-skipped";
    ScannerInput build = ScannerInput.create(projectKey, TestUtils.projectDir(projectKey))
      .withScmDisabled()
      .withVerbose()
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build, ScannerRunnerConfig.builder().build());

    assertThat(result.scannerOutputReader().getProject().getAllIssues()).isEmpty();
    assertThat(result.logOutput()).noneSatisfy(log ->
      assertThat(log.message()).isEqualTo("Creating Node.js process")
    );
  }
}
