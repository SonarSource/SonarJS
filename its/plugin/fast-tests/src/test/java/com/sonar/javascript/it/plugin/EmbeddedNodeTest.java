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

import com.sonar.orchestrator.locator.FileLocation;
import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import org.sonar.plugins.javascript.JavaScriptLanguage;

class EmbeddedNodeTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(JavaScriptLanguage.KEY),
    List.of(
      FileLocation.byWildcardMavenFilename(
        new File("../../../sonar-plugin/sonar-javascript-plugin/target"),
        "sonar-javascript-plugin-*" + classifier() + ".jar"
      )
    ),
    List.of(Path.of("src", "test", "resources", "eslint-based-rules.xml"))
  );

  @Test
  void embedded_node() {
    var projectKey = "eslint_based_rules";
    var projectDir = TestUtils.projectDir(projectKey);

    var build = ScannerInput.create(projectKey, projectDir).withScmDisabled().build();

    var result = ScannerRunner.run(SERVER_CONTEXT, build);

    assertThat(result.exitCode()).isEqualTo(0);
    assertThat(result.logOutput())
      .filteredOn(
        l ->
          l.level().equals(Log.Level.INFO) && l.message().equals("Using embedded Node.js runtime.")
      )
      .hasSize(1);
    assertThat(result.logOutput())
      .filteredOn(l -> l.level().equals(Log.Level.ERROR))
      .isEmpty();
  }

  private static String classifier() {
    var os = System.getProperty("os.name").toLowerCase(Locale.ROOT);
    var arch = System.getProperty("os.arch");
    if (os.contains("linux") && arch.contains("64")) {
      if (isAlpine()) {
        return "-linux-x64-musl";
      }
      return "-linux-x64";
    } else if (os.contains("windows")) {
      return "-win-x64";
    } else {
      return "-multi";
    }
  }

  private static boolean isAlpine() {
    return Files.exists(Path.of("/etc/alpine-release"));
  }
}
