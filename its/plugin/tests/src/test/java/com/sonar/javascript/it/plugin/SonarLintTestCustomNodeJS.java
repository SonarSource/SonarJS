/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2019 SonarSource SA
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

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.sonarsource.sonarlint.core.StandaloneSonarLintEngineImpl;
import org.sonarsource.sonarlint.core.client.api.common.analysis.ClientInputFile;
import org.sonarsource.sonarlint.core.client.api.common.analysis.Issue;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneAnalysisConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneGlobalConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneSonarLintEngine;

import static org.assertj.core.api.Assertions.assertThat;

public class SonarLintTestCustomNodeJS {

  private static final String FILE_PATH = "foo.js";

  @Rule
  public TemporaryFolder temp = new TemporaryFolder();

  private StandaloneSonarLintEngine sonarlintEngine;

  private static File baseDir;

  private List<String> logs = new ArrayList<>();

  @Before
  public void prepare() throws Exception {
    StandaloneGlobalConfiguration sonarLintConfig = StandaloneGlobalConfiguration.builder()
      .addPlugin(Tests.JAVASCRIPT_PLUGIN_LOCATION.getFile().toURI().toURL())
      .setSonarLintUserHome(temp.newFolder().toPath())
      .setLogOutput((formattedMessage, level) -> logs.add(formattedMessage))
      .build();
    sonarlintEngine = new StandaloneSonarLintEngineImpl(sonarLintConfig);
    baseDir = temp.newFolder();
  }

  @After
  public void stop() {
    sonarlintEngine.stop();
  }

  @Test
  public void should_use_set_nodejs() throws Exception {
    ClientInputFile inputFile = TestUtils.prepareInputFile(baseDir, FILE_PATH, "function foo() { try {" +
      "  doSomething();" +
      "} catch (ex) {" +
      "  throw ex;" +
      "}}");

    List<Issue> issues = new ArrayList<>();
    HashMap<String, String> properties = new HashMap<>();
    properties.put("sonar.nodejs.executable", TestUtils.getNodeJSExecutable());
    StandaloneAnalysisConfiguration configuration = new StandaloneAnalysisConfiguration(baseDir.toPath(), temp.newFolder().toPath(), Arrays.asList(inputFile), properties);
    sonarlintEngine.analyze(configuration, issues::add, null, null);
    assertThat(issues).extracting(Issue::getRuleKey).containsExactly("javascript:S2737");

    assertThat(logs.stream().anyMatch(s -> s.matches("Using Node\\.js executable .* from property sonar\\.nodejs\\.executable\\."))).isTrue();
  }


  @Test
  public void should_log_failure_only_once() throws Exception {
    ClientInputFile inputFile = TestUtils.prepareInputFile(baseDir, FILE_PATH, "function foo() { try {" +
      "  doSomething();" +
      "} catch (ex) {" +
      "  throw ex;" +
      "}}");

    HashMap<String, String> properties = new HashMap<>();
    properties.put("sonar.nodejs.executable", "invalid");
    StandaloneAnalysisConfiguration configuration = new StandaloneAnalysisConfiguration(baseDir.toPath(), temp.newFolder().toPath(), Arrays.asList(inputFile), properties);
    sonarlintEngine.analyze(configuration, i -> {
    }, null, null);

    assertThat(logs).contains("Provided Node.js executable file does not exist.");
    logs.clear();
    sonarlintEngine.analyze(configuration, i -> {
    }, null, null);
    assertThat(logs).doesNotContain("Provided Node.js executable file does not exist.");
    assertThat(logs).contains("Skipping start of eslint-bridge server due to the failure during first analysis");
  }
}
