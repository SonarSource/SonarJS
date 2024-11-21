/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Isolated;

@Isolated
class EmbeddedNodeTest {

  @Test
  void embedded_node() {
    var plugin = FileLocation.byWildcardMavenFilename(
      new File("../../../sonar-plugin/sonar-javascript-plugin/target"),
      "sonar-javascript-plugin-*" + classifier() + ".jar"
    );

    var orchestrator = OrchestratorExtension
      .builderEnv()
      .useDefaultAdminCredentialsForBuilds(true)
      .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/eslint-based-rules.xml"))
      .addPlugin(plugin)
      .build();

    synchronized (OrchestratorStarter.class) {
      orchestrator.start();
    }

    var projectKey = "eslint_based_rules";
    var server = orchestrator.getServer();
    server.provisionProject(projectKey, projectKey);
    server.associateProjectToQualityProfile(projectKey, "js", "eslint-based-rules-profile");

    var projectDir = TestUtils.projectDir(projectKey);
    var build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);

    var buildResult = orchestrator.executeBuild(build);
    assertThat(buildResult.isSuccess()).isTrue();
    assertThat(buildResult.getLogs()).contains("INFO: Using embedded Node.js runtime.");
    assertThat(buildResult.getLogsLines(l -> l.startsWith("ERROR"))).isEmpty();
    orchestrator.stop();
  }

  private static String classifier() {
    var os = System.getProperty("os.name").toLowerCase(Locale.ROOT);
    var arch = System.getProperty("os.arch");
    if (os.contains("linux") && arch.contains("64")) {
      return "-linux-x64";
    } else if (os.contains("windows")) {
      return "-win-x64";
    } else {
      return "-multi";
    }
  }
}
