/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2021 SonarSource SA
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

import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.locator.FileLocation;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.ClassRule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonarqube.ws.Issues.Issue;
import org.sonarqube.ws.client.issues.SearchRequest;
import org.sonarsource.analyzer.commons.ProfileGenerator;
import org.sonarsource.sonarlint.core.StandaloneSonarLintEngineImpl;
import org.sonarsource.sonarlint.core.client.api.common.analysis.ClientInputFile;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneAnalysisConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneGlobalConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneSonarLintEngine;

import static com.sonar.javascript.it.plugin.Tests.newWsClient;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;

public class TestCodeAnalysisTest {
  
  private static final String project = "test-code-project";

  @ClassRule
  public static final Orchestrator orchestrator = Tests.ORCHESTRATOR;

  @ClassRule
  public static final TemporaryFolder temp = new TemporaryFolder();

  @Test
  public void sonarqube() {
    String sourceDir = "src";
    String testDir = "test";
    
    SonarScanner build = SonarScanner.create()
      .setProjectKey(project)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(sourceDir)
      .setTestDirs(testDir)
      .setProjectDir(TestUtils.projectDir(project));

    File jsProfile = ProfileGenerator.generateProfile(
      orchestrator.getServer().getUrl(), "js", "javascript", new ProfileGenerator.RulesConfiguration(), new HashSet<>());
    orchestrator.getServer().restoreProfile(FileLocation.of(jsProfile));

    Tests.setProfile(project, "rules", "js");

    orchestrator.executeBuild(build);

    SearchRequest request = new SearchRequest();
    request.setComponentKeys(singletonList(project)).setRules(singletonList("javascript:S1848"));
    List<Issue> issuesList = newWsClient(orchestrator).issues().search(request).getIssuesList();
    assertThat(issuesList).hasSize(1);
    assertThat(issuesList.get(0).getComponent()).endsWith("src/file.js");
  }

  @Test
  public void sonarlint() throws Exception {
    File baseDir = TestUtils.projectDir(project);

    StandaloneGlobalConfiguration globalConfig = StandaloneGlobalConfiguration.builder()
      .addPlugin(Tests.JAVASCRIPT_PLUGIN_LOCATION.getFile().toURI().toURL())
      .setSonarLintUserHome(temp.newFolder().toPath())
      .build();

    List<ClientInputFile> inputFiles = Files.walk(baseDir.toPath())
      .filter(p -> !Files.isDirectory(p) && p.toString().endsWith(".js"))
      .map(p -> {
        try {
          return TestUtils.prepareInputFile(baseDir, baseDir.toPath().relativize(p).toString(), Files.lines(p).collect(Collectors.joining(System.lineSeparator())));
        } catch (IOException e) {
          e.printStackTrace();
          return null;
        }
      })
      .collect(Collectors.toList());
    
    StandaloneAnalysisConfiguration analysisConfig = StandaloneAnalysisConfiguration.builder()
      .setBaseDir(baseDir.toPath())
      .addInputFiles(inputFiles)
      .build();

    List<org.sonarsource.sonarlint.core.client.api.common.analysis.Issue> issues = new ArrayList<>();

    StandaloneSonarLintEngine sonarlintEngine = new StandaloneSonarLintEngineImpl(globalConfig);
    sonarlintEngine.analyze(analysisConfig, issues::add, null, null);
    sonarlintEngine.stop();

    assertThat(issues).extracting("ruleKey").containsOnly("javascript:S1848", "javascript:S1848");
  }
}
