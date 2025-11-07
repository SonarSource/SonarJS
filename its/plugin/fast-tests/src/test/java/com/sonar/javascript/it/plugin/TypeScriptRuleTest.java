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

import com.sonarsource.scanner.integrationtester.dsl.EngineVersion;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import shadow.com.sonar.orchestrator.locator.FileLocation;

class TypeScriptRuleTest {

  private static final String PROJECT_KEY = "ts-rule-project";
  private static final Path PROJECT_DIR = TestUtils.projectDir(PROJECT_KEY);

  private static final SonarServerContext SERVER_CONTEXT = SonarServerContext.builder()
    .withProduct(SonarServerContext.Product.SERVER)
    .withEngineVersion(EngineVersion.latestMasterBuild())
    .withPlugin(SonarScannerIntegrationHelper.getJavascriptPlugin())
    .withPlugin(SonarScannerIntegrationHelper.getLitsPlugin())
    .withLanguage(
      TypeScriptLanguage.KEY,
      "TYPESCRIPT",
      TypeScriptLanguage.FILE_SUFFIXES_KEY,
      TypeScriptLanguage.DEFAULT_FILE_SUFFIXES
    )
    .withActiveRules(
      loadActiveRulesFromXmlProfile(
        Path.of("src", "test", "resources", "ts-rules-project-profile.xml")
      )
    )
    .build();

  @Test
  void test() throws Exception {
    ExpectedIssues.parseForExpectedIssues(PROJECT_KEY, PROJECT_DIR);

    ScannerInput build = ScannerInput.create(PROJECT_KEY, PROJECT_DIR)
      .withScmDisabled()
      .withScannerProperty(
        "sonar.lits.dump.old",
        FileLocation.of("target/expected/ts/" + PROJECT_KEY).getFile().getAbsolutePath()
      )
      .withScannerProperty(
        "sonar.lits.dump.new",
        FileLocation.of("target/actual/ts/" + PROJECT_KEY).getFile().getAbsolutePath()
      )
      .withScannerProperty(
        "sonar.lits.differences",
        FileLocation.of("target/differences").getFile().getAbsolutePath()
      )
      .withScannerProperty("sonar.cpd.exclusions", "**/*")
      .build();

    ScannerRunner.run(SERVER_CONTEXT, build);

    assertThat(Files.readString(Paths.get("target/differences"))).isEmpty();
  }
}
