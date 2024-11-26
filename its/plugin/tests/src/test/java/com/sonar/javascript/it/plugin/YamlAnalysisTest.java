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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import java.io.IOException;
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

    var perfMonitoringDir = Path.of("target/monitoring/", projectKey);

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
    assertThat(result.getLogsLines(log -> log.contains("Creating Node.js process"))).hasSize(1);
    // assertPerfMonitoringAvailable(perfMonitoringDir);
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
    assertThat(result.getLogsLines(log -> log.contains("Creating Node.js process"))).hasSize(0);
  }
}
