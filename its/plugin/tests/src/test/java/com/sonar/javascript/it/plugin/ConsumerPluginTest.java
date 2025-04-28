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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class ConsumerPluginTest {

  private static final String PLUGIN_ARTIFACT_ID = "consumer-plugin";

  private static OrchestratorExtension orchestrator;

  @BeforeAll
  public static void before() {
    orchestrator = initOrchestrator(PLUGIN_ARTIFACT_ID);
  }

  @AfterAll
  public static void after() {
    orchestrator.stop();
  }

  static OrchestratorExtension initOrchestrator(String customRulesArtifactId) {
    var orchestrator = OrchestratorExtension.builderEnv()
      .useDefaultAdminCredentialsForBuilds(true)
      .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
      .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
      .restoreProfileAtStartup(FileLocation.ofClasspath("/empty-js-profile.xml"))
      .addPlugin(
        FileLocation.byWildcardMavenFilename(
          new File("../plugins/" + customRulesArtifactId + "/target"),
          customRulesArtifactId + "-*.jar"
        )
      )
      .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-javascript-custom-rules.xml"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/profile-typescript-custom-rules.xml"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/nosonar.xml"))
      .build();
    // Installation of SQ server in orchestrator is not thread-safe, so we need to synchronize
    synchronized (OrchestratorStarter.class) {
      orchestrator.start();
    }
    return orchestrator;
  }

  static BuildResult runBuild(Orchestrator orchestrator) {
    SonarScanner build = OrchestratorStarter.createScanner()
      .setProjectDir(TestUtils.projectDirNoCopy("custom_rules"))
      .setProjectKey("custom-rules")
      .setProjectName("Custom Rules")
      .setProjectVersion("1.0")
      .setDebugLogs(true)
      .setSourceDirs("src");
    orchestrator.getServer().provisionProject("custom-rules", "Custom Rules");
    orchestrator
      .getServer()
      .associateProjectToQualityProfile("custom-rules", "js", "javascript-custom-rules-profile");
    orchestrator
      .getServer()
      .associateProjectToQualityProfile("custom-rules", "ts", "ts-custom-rules-profile");
    return orchestrator.executeBuild(build);
  }

  @Test
  void test() {
    var buildResult = runBuild(orchestrator);
    var logMatch =
      ".*DEBUG: Registered JsAnalysisConsumers \\[org.sonar.samples.javascript.consumer.Consumer.*]";
    assertThat(buildResult.getLogsLines(l -> l.matches(logMatch))).hasSize(1);

    // TS file is not processed yet.
    assertThat(buildResult.getLogsLines(l -> l.matches(".*Processing file src/dir.*"))).hasSize(2);
  }
}
