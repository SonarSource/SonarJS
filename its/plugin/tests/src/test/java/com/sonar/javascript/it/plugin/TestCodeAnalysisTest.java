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

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.newWsClient;
import static com.sonar.javascript.it.plugin.TestUtils.sonarLintInputFile;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.parallel.Isolated;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;
import org.sonarsource.sonarlint.core.NodeJsHelper;
import org.sonarsource.sonarlint.core.StandaloneSonarLintEngineImpl;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneAnalysisConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneGlobalConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneSonarLintEngine;
import org.sonarsource.sonarlint.core.commons.Language;

@Isolated
@ExtendWith(OrchestratorStarter.class)
class TestCodeAnalysisTest {

  private static final String project = "test-code-project";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  @TempDir
  Path sonarLintUserHome;

  @Test
  void sonarqube() {
    String sourceDir = "src";
    String testDir = "test";

    SonarScanner build = getSonarScanner()
      .setProjectKey(project)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(sourceDir)
      .setTestDirs(testDir)
      .setProjectDir(TestUtils.projectDir(project));

    var jsProfile = ProfileGenerator.generateProfile(
      orchestrator,
      "js",
      "javascript",
      new ProfileGenerator.RulesConfiguration(),
      new HashSet<>()
    );

    OrchestratorStarter.setProfile(project, jsProfile, "js");

    BuildResult buildResult = orchestrator.executeBuild(build);

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(project)).setRules(singletonList("javascript:S1848"));
    List<Issue> issuesList = newWsClient(orchestrator).issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getComponent()).endsWith("src/file.js");
    assertThat(buildResult.getLogsLines(l -> l.contains("2 source files to be analyzed")))
      .hasSize(1);
  }

  @Test
  void sonarlint() throws Exception {
    var baseDir = TestUtils.projectDir(project).toPath();

    NodeJsHelper nodeJsHelper = new NodeJsHelper();
    nodeJsHelper.detect(null);

    StandaloneGlobalConfiguration globalConfig = StandaloneGlobalConfiguration
      .builder()
      .addEnabledLanguage(Language.JS)
      .addEnabledLanguage(Language.TS)
      .addPlugin(OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION.getFile().toPath())
      .setSonarLintUserHome(sonarLintUserHome)
      .setNodeJs(nodeJsHelper.getNodeJsPath(), nodeJsHelper.getNodeJsVersion())
      .setLogOutput((formattedMessage, level) -> {
        System.out.println(formattedMessage);
      })
      .build();

    var srcFile = baseDir.resolve("src/file.js");
    var testFile = baseDir.resolve("test/file.test.js");
    var inputFiles = List.of(
      sonarLintInputFile(srcFile, Files.readString(srcFile)),
      sonarLintInputFile(testFile, Files.readString(testFile))
    );

    StandaloneAnalysisConfiguration analysisConfig = StandaloneAnalysisConfiguration
      .builder()
      .setBaseDir(baseDir)
      .addInputFiles(inputFiles)
      .build();

    List<org.sonarsource.sonarlint.core.client.api.common.analysis.Issue> issues =
      new ArrayList<>();

    StandaloneSonarLintEngine sonarlintEngine = new StandaloneSonarLintEngineImpl(globalConfig);
    sonarlintEngine.analyze(analysisConfig, issues::add, null, null);
    sonarlintEngine.stop();

    assertThat(issues)
      .extracting(org.sonarsource.sonarlint.core.client.api.common.analysis.Issue::getRuleKey)
      .containsOnly("javascript:S1848", "javascript:S1848");
  }
}
