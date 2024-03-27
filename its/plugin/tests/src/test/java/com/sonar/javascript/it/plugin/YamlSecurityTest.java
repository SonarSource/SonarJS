/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2024 SonarSource SA
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
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.javascript.it.plugin.assertj.BuildResultAssert;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.container.Edition;
import com.sonar.orchestrator.junit5.OrchestratorExtension;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class YamlSecurityTest {

  private static Orchestrator orchestrator;

  @Test
  void should_generate_ucfgs_for_yaml() throws IOException {
    var projectKey = "yaml-aws-lambda-analyzed";
    var projectPath = TestUtils.projectDir(projectKey);

    OrchestratorStarter.setProfiles(
      orchestrator,
      projectKey,
      Map.of("yaml-security-profile", "js")
    );

    var result = orchestrator.executeBuild(getScanner(projectPath, projectKey));
    assertThat(result.isSuccess()).isTrue();

    var stream = Files.find(
      projectPath.toPath().resolve(".scannerwork"),
      3,
      BuildResultAssert::isUcfgFile
    );
    assertThat(stream.toList().size() == 1).isTrue();
  }

  @BeforeAll
  public static void startOrchestrator() {
    var builder = OrchestratorExtension
      .builderEnv()
      .useDefaultAdminCredentialsForBuilds(true)
      .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
      .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
      .setEdition(Edition.DEVELOPER)
      .activateLicense()
      .addPlugin(MavenLocation.of("com.sonarsource.security", "sonar-security-plugin", "DEV"))
      .addPlugin(
        MavenLocation.of("com.sonarsource.security", "sonar-security-js-frontend-plugin", "DEV")
      )
      .addPlugin(
        MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", "LATEST_RELEASE")
      )
      .restoreProfileAtStartup(FileLocation.ofClasspath("/yaml-security-profile.xml"));

    orchestrator = builder.build();
    // Installation of SQ server in orchestrator is not thread-safe, so we need to synchronize
    synchronized (OrchestratorStarter.class) {
      orchestrator.start();
    }
  }

  @AfterAll
  public static void stopOrchestrator() {
    orchestrator.stop();
  }

  private static SonarScanner getScanner(File projectDir, String projectKey) {
    return getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setDebugLogs(true)
      .setSourceDirs(".")
      .setProjectDir(projectDir);
  }
}
