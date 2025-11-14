/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import com.sonar.orchestrator.locator.FileLocation;
import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.io.File;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

class ConsumerPluginTest {

  private static final String PLUGIN_ARTIFACT_ID = "consumer-plugin";

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY),
    List.of(
      SonarScannerIntegrationHelper.getJavascriptPlugin(),
      FileLocation.byWildcardMavenFilename(
        new File("../plugins/" + PLUGIN_ARTIFACT_ID + "/target"),
        PLUGIN_ARTIFACT_ID + "-*.jar"
      )
    ),
    List.of(
      Path.of("src", "test", "resources", "profile-javascript-custom-rules.xml"),
      Path.of("src", "test", "resources", "profile-typescript-custom-rules.xml"),
      Path.of("src", "test", "resources", "nosonar.xml")
    )
  );

  @Test
  void test() {
    var projectKey = "custom-rules";
    var build = ScannerInput.create(projectKey, TestUtils.projectDirNoCopy("custom_rules"))
      .withScmDisabled()
      .withVerbose()
      .withSourceDirs("src")
      .build();
    var result = ScannerRunner.run(SERVER_CONTEXT, build);
    var logMatch =
      "Registered JsAnalysisConsumers \\[org.sonar.samples.javascript.consumer.Consumer.*]";
    assertThat(result.logOutput())
      .filteredOn(log -> log.level().equals(Log.Level.DEBUG) && log.message().matches(logMatch))
      .hasSize(1);

    // TS file is not processed yet.
    assertThat(result.logOutput())
      .filteredOn(l -> l.message().matches(".*Processing file src/dir.*"))
      .hasSize(2);
  }
}
