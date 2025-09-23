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
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.analysis.YamlSensor;

class YamlAnalysisTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestMasterBuild())
    .withLanguage(
      new SonarServerContext.Language(YamlSensor.LANGUAGE, "YAML", new String[] { ".yaml" })
    )
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withPlugin(SonarScannerIntegrationHelper.getYamlPlugin())
    .withActiveRules(
      loadActiveRulesFromXmlProfile(Path.of("src", "test", "resources", "eslint-based-rules.xml"))
    )
    .build();

  @Test
  void single_line_inline_aws_lambda_for_js() {
    var projectKey = "yaml-aws-lambda-analyzed";

    ScannerInput build = ScannerInput.create(projectKey, TestUtils.projectDir(projectKey).toPath())
      .withScmDisabled()
      .withVerbose()
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build);

    assertThat(
      result
        .scannerOutputReader()
        .getProject()
        .getAllIssues()
        .stream()
        .filter(ScannerOutputReader.FileIssue.class::isInstance)
        .map(ScannerOutputReader.FileIssue.class::cast)
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
    ScannerInput build = ScannerInput.create(projectKey, TestUtils.projectDir(projectKey).toPath())
      .withScmDisabled()
      .withVerbose()
      .build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build);

    assertThat(result.scannerOutputReader().getProject().getAllIssues()).isEmpty();
    assertThat(result.logOutput()).noneSatisfy(log ->
      assertThat(log.message()).isEqualTo("Creating Node.js process")
    );
  }
}
