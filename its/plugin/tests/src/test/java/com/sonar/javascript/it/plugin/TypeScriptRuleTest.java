/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package com.sonar.javascript.it.plugin;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static java.util.Collections.singleton;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class TypeScriptRuleTest {

  private static final String PROJECT_KEY = "ts-rule-project";
  private static final File PROJECT_DIR = TestUtils.projectDir(PROJECT_KEY);
  static final String LITS_VERSION = "0.11.0.2659";

  private static OrchestratorExtension orchestrator;

  @BeforeAll
  public static void before() throws IOException, InterruptedException {
    orchestrator =
      OrchestratorExtension
        .builderEnv()
        .useDefaultAdminCredentialsForBuilds(true)
        .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
        .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
        .addPlugin(
          MavenLocation.of("org.sonarsource.sonar-lits-plugin", "sonar-lits-plugin", LITS_VERSION)
        )
        .build();

    // Installation of SQ server in orchestrator is not thread-safe, so we need to synchronize
    synchronized (OrchestratorStarter.class) {
      orchestrator.start();
    }

    ProfileGenerator.generateProfile(
      orchestrator,
      "ts",
      "typescript",
      new ProfileGenerator.RulesConfiguration(),
      singleton("S124")
    );
    ProfileGenerator.generateProfile(
      orchestrator,
      "js",
      "javascript",
      new ProfileGenerator.RulesConfiguration(),
      singleton("CommentRegularExpression")
    );

    orchestrator
      .getServer()
      .restoreProfile(FileLocation.ofClasspath("/ts-rules-project-profile.xml"))
      .restoreProfile(FileLocation.ofClasspath("/empty-js-profile.xml"))
      .restoreProfile(FileLocation.ofClasspath("/empty-css-profile.xml"));
  }

  @AfterAll
  public static void after() {
    orchestrator.stop();
  }

  @Test
  void test() throws Exception {
    ExpectedIssues.parseForExpectedIssues(PROJECT_KEY, PROJECT_DIR.toPath());
    orchestrator.getServer().provisionProject(PROJECT_KEY, PROJECT_KEY);

    orchestrator
      .getServer()
      .associateProjectToQualityProfile(PROJECT_KEY, "ts", "ts-rules-project-profile");
    orchestrator.getServer().associateProjectToQualityProfile(PROJECT_KEY, "js", "empty-profile");
    orchestrator.getServer().associateProjectToQualityProfile(PROJECT_KEY, "css", "empty-profile");

    Path perfMonitoringDir = Path.of("target/monitoring/", PROJECT_KEY);
    SonarScanner build = getSonarScanner()
      .setProjectDir(PROJECT_DIR)
      .setProjectKey(PROJECT_KEY)
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProperty(
        "sonar.lits.dump.old",
        FileLocation.of("target/expected/ts/" + PROJECT_KEY).getFile().getAbsolutePath()
      )
      .setProperty(
        "sonar.lits.dump.new",
        FileLocation.of("target/actual/ts/" + PROJECT_KEY).getFile().getAbsolutePath()
      )
      .setProperty(
        "sonar.lits.differences",
        FileLocation.of("target/differences").getFile().getAbsolutePath()
      )
      .setProperty("sonar.javascript.monitoring", "true")
      .setProperty(
        "sonar.javascript.monitoring.path",
        perfMonitoringDir.toAbsolutePath().toString()
      )
      .setProperty("sonar.cpd.exclusions", "**/*");

    orchestrator.executeBuild(build);

    assertThat(
      new String(Files.readAllBytes(Paths.get("target/differences")), StandardCharsets.UTF_8)
    )
      .isEmpty();
    assertPerfMonitoringAvailable(perfMonitoringDir);
  }

  // asserting perf monitoring on TypeScript project as it creates all kinds of metrics
  private void assertPerfMonitoringAvailable(Path perfMonitoringDir) throws IOException {
    String content = Files.readString(perfMonitoringDir.resolve("metrics.json"));
    assertThat(content)
      .contains("\"metricType\":\"FILE\"")
      .contains("\"metricType\":\"SENSOR\"")
      .contains("\"metricType\":\"PROGRAM\"")
      .contains("\"metricType\":\"RULE\"");
  }
}
