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
import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonarsource.sonarlint.core.NodeJsHelper;
import org.sonarsource.sonarlint.core.StandaloneSonarLintEngineImpl;
import org.sonarsource.sonarlint.core.client.api.common.analysis.Issue;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneAnalysisConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneGlobalConfiguration;
import org.sonarsource.sonarlint.core.client.api.standalone.StandaloneSonarLintEngine;
import org.sonarsource.sonarlint.core.commons.Language;

class SonarLintTestCodeAnalysisTest {

  private static final String project = "test-code-project";

  @TempDir
  Path sonarLintUserHome;

  @Test
  void sonarlint() throws Exception {
    var baseDir = TestUtils.projectDir(project);

    NodeJsHelper nodeJsHelper = new NodeJsHelper();
    nodeJsHelper.detect(null);

    StandaloneGlobalConfiguration globalConfig = StandaloneGlobalConfiguration
      .builder()
      .addEnabledLanguage(Language.JS)
      .addEnabledLanguage(Language.TS)
      .addPlugin(TestUtils.JAVASCRIPT_PLUGIN_LOCATION)
      .setSonarLintUserHome(sonarLintUserHome)
      .setNodeJs(nodeJsHelper.getNodeJsPath(), nodeJsHelper.getNodeJsVersion())
      .setLogOutput((formattedMessage, level) -> {
        System.out.println(formattedMessage);
      })
      .build();

    var srcFile = baseDir.resolve("src/file.js");
    var testFile = baseDir.resolve("test/file.test.js");
    var inputFiles = List.of(
      TestUtils.sonarLintInputFile(srcFile, Files.readString(srcFile)),
      TestUtils.sonarLintInputFile(testFile, Files.readString(testFile))
    );

    StandaloneAnalysisConfiguration analysisConfig = StandaloneAnalysisConfiguration
      .builder()
      .setBaseDir(baseDir)
      .addInputFiles(inputFiles)
      .build();

    List<Issue> issues = new ArrayList<>();

    StandaloneSonarLintEngine sonarlintEngine = new StandaloneSonarLintEngineImpl(globalConfig);
    sonarlintEngine.analyze(analysisConfig, issues::add, null, null);
    sonarlintEngine.stop();

    assertThat(issues)
      .extracting(Issue::getRuleKey)
      .containsOnly("javascript:S1848", "javascript:S1848");
  }
}
