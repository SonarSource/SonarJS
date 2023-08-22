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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.sonarqube.ws.Issues.Issue;

@ExtendWith(OrchestratorStarter.class)
public class YamlAnalysisTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @Test
  void single_line_inline_aws_lambda_for_js() throws IOException {
    var projectKey = "yaml-aws-lambda-analyzed";

    Path perfMonitoringDir = Path.of("target/monitoring/", projectKey);

    var build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProjectDir(TestUtils.projectDir(projectKey))
      .setProperty("sonar.javascript.monitoring", "true")
      .setProperty(
        "sonar.javascript.monitoring.path",
        perfMonitoringDir.toAbsolutePath().toString()
      );

    OrchestratorStarter.setProfiles(projectKey, Map.of("eslint-based-rules-profile", "js"));
    BuildResult result = orchestrator.executeBuild(build);

    var issuesList = getIssues(projectKey);
    assertThat(issuesList)
      .extracting(Issue::getLine, Issue::getRule)
      .containsExactlyInAnyOrder(tuple(12, "javascript:S3923"));
    assertThat(result.getLogsLines(log -> log.contains("Starting Node.js process"))).hasSize(1);

    assertPerfMonitoringAvailable(perfMonitoringDir);
  }

  private void assertPerfMonitoringAvailable(Path perfMonitoringDir) throws IOException {
    String content = Files.readString(perfMonitoringDir.resolve("metrics.json"));
    assertThat(content)
      .contains("\"ncloc\":1")
      .containsPattern("\"parseTime\":\\d+")
      .containsPattern("\"analysisTime\":\\d+")
      .contains("\"component\":\"file.yaml\"");
  }

  @Test
  void dont_start_eslint_bridge_for_yaml_without_nodejs_aws() {
    var projectKey = "yaml-aws-lambda-skipped";
    var build = getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setDebugLogs(true)
      .setProjectDir(TestUtils.projectDir(projectKey));

    OrchestratorStarter.setProfiles(projectKey, Map.of("eslint-based-rules-profile", "js"));
    BuildResult result = orchestrator.executeBuild(build);
    assertThat(result.getLogsLines(log -> log.contains("Starting Node.js process"))).hasSize(0);
  }
}
