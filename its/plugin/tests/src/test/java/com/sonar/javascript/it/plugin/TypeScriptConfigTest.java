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

import com.sonar.javascript.it.plugin.assertj.BuildResultAssert;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.Arrays;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@ExtendWith(OrchestratorStarter.class)
class TypeScriptConfigTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;
  private static final String PROJECT_ROOT = "typescript-config";

  @Test
  void multiple_targets() {
    var project = "multiple-targets";
    var key = getKey(project);
    var scanner = getSonarScanner(project);

    BuildResultAssert.assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 1 tsconfig.json file(s)")
      .logsOnce("INFO: Skipped 1 file(s) because they were not part of any tsconfig.json (enable debug logs to see the full list)");

    assertThat(getIssues(key)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, key + ":src/main.ts")
    );
    // Missing issues for main.test.ts

    var configuredBuild = scanner.setProperty("sonar.typescript.tsconfigPaths", "tsconfig.json,tsconfig.test.json");
    BuildResultAssert.assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("Found 2 TSConfig file(s)")
        .doesNotLog("INFO: Skipped");

    assertThat(getIssues(key)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, key + ":src/main.ts"),
      tuple(4, key + ":src/main.test.ts")
    );
  }

  @Test
  void extend_main_from_folder() {
    var project = "extend-main-from-folder";
    var key = getKey(project);
    var scanner = getSonarScanner(project);

    BuildResultAssert.assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 2 tsconfig.json file(s)");

    assertThat(getIssues(key)).isEmpty();
    // Missing issues for main.ts

    var configuredBuild = scanner.setProperty("sonar.typescript.tsconfigPaths", "src/tsconfig.json");
    BuildResultAssert.assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("Found 1 TSConfig file(s)");

    assertThat(getIssues(key)).extracting(Issues.Issue::getLine, Issues.Issue::getComponent).containsExactlyInAnyOrder(
      tuple(4, key + ":src/main.ts")
    );
  }

  @Test
  void should_analyze_javascript_with_jsconfig() {
    var project = "jsconfig";
    var key = getKey(project);
    var scanner = getSonarScanner(project);
    var buildResult = orchestrator.executeBuild(scanner);

    BuildResultAssert.assertThat(buildResult).logsOnce("INFO: 2/2 source files have been analyzed");
    assertThat(getIssues(key)).isEmpty(); // False negative
  }

  @ParameterizedTest
  @EnumSource(Project.class)
  void should_analyze_with_zero_config(Project project) {
    var scanner = getSonarScanner(project.getName());
    var buildResult = orchestrator.executeBuild(scanner);

    BuildResultAssert.assertThat(buildResult).logsOnce(String.format("Found %d tsconfig.json file(s)", project.getExpectedFound()));
    assertThat(getIssues(project.getKey())).extracting(Issues.Issue::getLine, Issues.Issue::getComponent)
      .containsExactlyInAnyOrder(project.getIssues());
  }

  private static String getKey(String project) {
    return "typescript-config-" + project;
  }

  private static SonarScanner getSonarScanner(String name) {
    var key = getKey(name);
    var projectDir = TestUtils.projectDir(PROJECT_ROOT).toPath().resolve(name).toFile();

    orchestrator.getServer().provisionProject(key, key);
    orchestrator.getServer().associateProjectToQualityProfile(key, "ts", "typescript-config-ts-profile");
    orchestrator.getServer().associateProjectToQualityProfile(key, "js", "typescript-config-js-profile");

    return OrchestratorStarter.getSonarScanner()
      .setProjectKey(key)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);
  }

  private enum Project {
    EXTEND_BASE_FROM_FOLDER("extend-base-from-folder", 1, "src/main.ts"),
    SHARED_BASE("shared-base", 1, "src/main.ts"),
    MONOREPO("monorepo", 2, "project-1/main.ts", "project-2/main.ts"),
    SOLUTION_TSCONFIG("solution-tsconfig", 3, "library/index.ts");

    private static final int ISSUE_LINE = 4;

    private final String name;
    private final int expectedFound;
    private final String[] filesWithIssue;

    Project(String name, int expectedFound, String... filesWithIssue) {
      this.name = name;
      this.expectedFound = expectedFound;
      this.filesWithIssue = filesWithIssue;
    }

    String getName() {
      return name;
    }

    String getKey() {
      return TypeScriptConfigTest.getKey(name);
    }

    int getExpectedFound() {
      return expectedFound;
    }

    Tuple[] getIssues() {
      return Arrays.stream(filesWithIssue).map(file -> tuple(ISSUE_LINE, getKey() + ":" + file)).toArray(Tuple[]::new);
    }
  }

}
