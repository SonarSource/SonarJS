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
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.analysis.YamlSensor;

class YamlSecurityTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.CLOUD)
    .withEngineVersion(EngineVersion.latestMasterBuild())
    .withLanguage(
      new SonarServerContext.Language(YamlSensor.LANGUAGE, "YAML", new String[] { ".yaml" })
    )
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withPlugin(SonarScannerIntegrationHelper.getYamlPlugin())
    .withPlugin(SonarScannerIntegrationHelper.getSecurityPlugin())
    .withPlugin(SonarScannerIntegrationHelper.getSecurityJsFrontendPlugin())
    .withActiveRules(
      loadActiveRulesFromXmlProfile(
        Path.of("src", "test", "resources", "yaml-security-profile.xml")
      )
    )
    .build();

  @Test
  void should_generate_ucfgs_for_yaml() throws IOException {
    var projectKey = "yaml-aws-lambda-analyzed";
    var projectPath = TestUtils.projectDir(projectKey);
    var uniqueProjectKey = projectKey + "-" + UUID.randomUUID();
    var workDir = Files.createDirectory(projectPath.resolve(".scannerwork"));

    var build = ScannerInput.create(uniqueProjectKey, projectPath)
      .withScmDisabled()
      .withOrganizationKey("myOrg")
      .withVerbose()
      .withWorkDir(workDir.toAbsolutePath())
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    assertThat(result.exitCode()).isEqualTo(0);

    var stream = Files.find(projectPath.resolve(".scannerwork"), 3, TestUtils::isUcfgFile);
    assertThat(stream.toList()).hasSize(1);
  }
}
