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
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonar.javascript.it.plugin.assertj.BuildResultAssert;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.SonarScanner;
import java.util.Arrays;
import java.util.List;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.sonarqube.ws.Issues;

/**
 * Tests different TypeScript project structures to verify SonarJS ability to run typed rules (like S3003 'strings-comparison').
 * Typed rules can run only if the type checker can load modules which will depend on the tsconfig.json 'baseUrl' property
 * that changes the default module resolution.
 * <p>
 * All the projects defined under the 'typechecker-config' folder can be built and executed using npm. However, TypeScript
 * doesn't resolve the 'baseUrl' value when generating the JavaScript code. So, to run the code in NodeJS, the projects need to
 * postprocess the generated code with 'tsc-alias'.
 */
@ExtendWith(OrchestratorStarter.class)
class TypeCheckerConfigTest {

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;
  private static final String PROJECT_ROOT = "typechecker-config";

  /**
   * Tests a project having a main tsconfig.json and an additional tsconfig.es6.json files extending the main file to target a different
   * environment (ES6 instead of ES3 by default).
   * The file tsconfig.es6.json is not detected by default and any parameters impacting type checking (like baseUrl) will prevent
   * the analyzer from finding the expected issue.
   */
  @Test
  void multiple_targets() {
    var project = "multiple-targets";
    var key = createName(project);
    var scanner = getSonarScanner(project);

    BuildResultAssert
      .assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 1 tsconfig.json file(s)")
      .logsOnce(
        "INFO: Skipped 1 file(s) because they were not part of any tsconfig.json (enable debug logs to see the full list)"
      );

    assertThat(getIssues(key))
      .extracting(Issues.Issue::getLine, Issues.Issue::getComponent)
      .containsExactlyInAnyOrder(tuple(4, key + ":src/main.ts"));
    // Missing issues for main.es6.ts

    var configuredBuild = scanner.setProperty(
      "sonar.typescript.tsconfigPaths",
      "tsconfig.json,tsconfig.es6.json"
    );
    BuildResultAssert
      .assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("Found 2 TSConfig file(s)")
      .doesNotLog("INFO: Skipped");

    assertThat(getIssues(key))
      .extracting(Issues.Issue::getLine, Issues.Issue::getComponent)
      .containsExactlyInAnyOrder(
        tuple(4, key + ":src/main.ts"),
        tuple(4, key + ":src/main.es6.ts")
      );
  }

  /**
   * Test a project having a main tsconfig.json file at the root and secondary tsconfig.json in sub-folders extending the main file.
   * The analyzer will find the root tsconfig.json first and will analyze all files with it, ignoring the secondary files and any
   * parameters impacting type checking (like baseUrl).
   */
  @Test
  void extend_main_from_folder() {
    var project = "extend-main-from-folder";
    var key = createName(project);
    var scanner = getSonarScanner(project);

    BuildResultAssert
      .assertThat(orchestrator.executeBuild(scanner))
      .logsOnce("Found 2 tsconfig.json file(s)");

    assertThat(getIssues(key)).isEmpty();
    // Missing issues for main.ts

    var configuredBuild = scanner.setProperty(
      "sonar.typescript.tsconfigPaths",
      "src/tsconfig.json"
    );
    BuildResultAssert
      .assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("Found 1 TSConfig file(s)");

    assertThat(getIssues(key))
      .extracting(Issues.Issue::getLine, Issues.Issue::getComponent)
      .containsExactlyInAnyOrder(tuple(4, key + ":src/main.ts"));
  }

  /**
   * Test a project having a jsconfig.json for JavaScript files.
   * The analyzer doesn't search for 'jsconfig.json' files. So it will ignore any parameters impacting type checking (like baseUrl) which
   * will prevent the analyzer from finding the expected issue.
   */
  @Test
  void should_analyze_javascript_with_jsconfig() {
    var project = "jsconfig";
    var key = createName(project);
    var scanner = getSonarScanner(project);

    var buildResult = orchestrator.executeBuild(scanner);
    BuildResultAssert.assertThat(buildResult).logsOnce("INFO: 2/2 source files have been analyzed");
    assertThat(getIssues(key)).isEmpty(); // False negative

    var configuredBuild = scanner.setProperty(
      "sonar.typescript.tsconfigPaths",
      "src/jsconfig.json"
    );
    BuildResultAssert
      .assertThat(orchestrator.executeBuild(configuredBuild))
      .logsOnce("INFO: 2/2 source files have been analyzed");
    assertThat(getIssues(key)).isEmpty(); // False negative
  }

  @ParameterizedTest
  @EnumSource(Project.class)
  void should_analyze_with_zero_config(Project project) {
    var scanner = getSonarScanner(project.getName());
    var buildResult = orchestrator.executeBuild(scanner);

    BuildResultAssert
      .assertThat(buildResult)
      .logsOnce(String.format("Found %d tsconfig.json file(s)", project.getExpectedFound()));
    assertThat(getIssues(project.getKey()))
      .extracting(Issues.Issue::getLine, Issues.Issue::getComponent)
      .containsExactlyInAnyOrder(project.getIssues());
  }

  private static String createName(String name) {
    return String.join("-", List.of(PROJECT_ROOT, name));
  }

  private static SonarScanner getSonarScanner(String directory) {
    var key = createName(directory);
    var projectDir = TestUtils.projectDir(PROJECT_ROOT).toPath().resolve(directory).toFile();

    orchestrator.getServer().provisionProject(key, key);
    orchestrator.getServer().associateProjectToQualityProfile(key, "ts", createName("ts-profile"));
    orchestrator.getServer().associateProjectToQualityProfile(key, "js", createName("js-profile"));

    return OrchestratorStarter
      .getSonarScanner()
      .setProjectKey(key)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(projectDir);
  }

  /**
   * This enumeration lists the projects working with zero-configuration.
   */
  private enum Project {
    /**
     * Test a project with a base tsconfig.base.json and a main tsconfig.json extending the base file located in the parent folder.
     * The analyzer will detect the main tsconfig.json and TypeScript will read automatically the base file.
     */
    EXTEND_BASE_FROM_FOLDER("extend-base-from-folder", 1, "src/main.ts"),

    /**
     * Test a project with a base tsconfig.base.json and main tsconfig.json extending the base file located in the same folder.
     * The analyzer will detect the main tsconfig.json and TypeScript will read automatically the base file.
     */
    SHARED_BASE("shared-base", 1, "src/main.ts"),

    /**
     * Test a project with subprojects having their own main tsconfig.json files.
     * The analyzer will detect all the main tsconfig.json files and will run typed rules.
     */
    MONOREPO("monorepo", 2, "project-1/main.ts", "project-2/main.ts"),

    /**
     * Test incremental build on a project A with 2 subprojects B and C where C has a dependency on B. The 3 tsconfig.json files of
     * A, B and C extend a base tsconfig.base.json to get the common compiler settings and add the file inclusion rules as well as
     * project references.
     * The analyzer will detect all 3 main tsconfig.json files and will use them correctly because the root tsconfig.json of project A,
     * used before the others, specifies an empty list of files as expected according to the
     * <a href="https://www.typescriptlang.org/docs/handbook/project-references.html#overall-structure">
     * TypeScript Project References</a> guide.
     */
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
      return createName(name);
    }

    int getExpectedFound() {
      return expectedFound;
    }

    Tuple[] getIssues() {
      return Arrays
        .stream(filesWithIssue)
        .map(file -> tuple(ISSUE_LINE, getKey() + ":" + file))
        .toArray(Tuple[]::new);
    }
  }
}
