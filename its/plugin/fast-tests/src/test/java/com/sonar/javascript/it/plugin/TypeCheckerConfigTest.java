/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource Sàrl
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.sonarsource.scanner.integrationtester.dsl.Log;
import com.sonarsource.scanner.integrationtester.dsl.ScannerInput;
import com.sonarsource.scanner.integrationtester.dsl.ScannerOutputReader;
import com.sonarsource.scanner.integrationtester.dsl.SonarServerContext;
import com.sonarsource.scanner.integrationtester.dsl.issue.TextRangeIssue;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunner;
import com.sonarsource.scanner.integrationtester.runner.ScannerRunnerConfig;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import org.assertj.core.api.Assertions;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;

/**
 * Tests different TypeScript project structures to verify SonarJS ability to run typed rules (like S3003 'strings-comparison').
 * Typed rules can run only if the type checker can load modules which will depend on the tsconfig.json 'baseUrl' property
 * that changes the default module resolution.
 * <p>
 * All the projects defined under the 'typechecker-config' folder can be built and executed using npm. However, TypeScript
 * doesn't resolve the 'baseUrl' value when generating the JavaScript code. So, to run the code in NodeJS, the projects need to
 * postprocess the generated code with 'tsc-alias'.
 */
class TypeCheckerConfigTest {

  private static final SonarServerContext SERVER_CONTEXT = SonarScannerIntegrationHelper.getContext(
    List.of(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY),
    List.of(SonarScannerIntegrationHelper.getJavascriptPlugin()),
    List.of(
      Path.of("src", "test", "resources", "typechecker-config-js.xml"),
      Path.of("src", "test", "resources", "typechecker-config-ts.xml")
    )
  );

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
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      getSonarScannerBuilder(project).build(),
      ScannerRunnerConfig.builder().build()
    );

    assertThat(result.logOutput())
      .extracting(Log::message)
      .filteredOn(m -> m.startsWith("Found 1 tsconfig.json file(s)"))
      .hasSize(1);
    assertThat(result.logOutput())
      .filteredOn(
        l ->
          l.level().equals(Log.Level.INFO) &&
          l.message().equals("Analyzing 1 file(s) using merged compiler options")
      )
      .hasSize(1);

    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    assertThat(issues)
      .extracting(TextRangeIssue::line, TextRangeIssue::componentPath)
      .containsExactlyInAnyOrder(tuple(4, "src/main.ts"));
    // Missing issues for main.es6.ts

    var result2 = ScannerRunner.run(
      SERVER_CONTEXT,
      getSonarScannerBuilder(project)
        .withScannerProperty("sonar.typescript.tsconfigPaths", "tsconfig.json,tsconfig.es6.json")
        .build(),
      ScannerRunnerConfig.builder().build()
    );

    assertThat(result2.logOutput())
      .extracting(Log::message)
      .filteredOn(m -> m.startsWith("Found 2 tsconfig.json file(s)"))
      .hasSize(1);
    assertThat(result2.logOutput())
      .filteredOn(m -> m.message().equals("Skipped") && m.level().equals(Log.Level.INFO))
      .isEmpty();

    var issues2 = result2
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    assertThat(issues2)
      .extracting(TextRangeIssue::line, TextRangeIssue::componentPath)
      .containsExactlyInAnyOrder(tuple(4, "src/main.ts"), tuple(4, "src/main.es6.ts"));
  }

  /**
   * Test a project having a main tsconfig.json file at the root and secondary tsconfig.json in sub-folders extending the main file.
   * When sonar.typescript.tsconfigPaths lists tsconfig.json before src/tsconfig.json, the root tsconfig (without baseUrl) is
   * processed first, so module resolution fails and the issue is missed.
   * When only src/tsconfig.json is provided (which has baseUrl), the issue is correctly found.
   */
  @Test
  void extend_main_from_folder() {
    var project = "extend-main-from-folder";
    var scanner = getSonarScannerBuilder(project);

    // Root tsconfig.json processed first (no baseUrl) → module resolution fails → no issue
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      scanner
        .withScannerProperty("sonar.typescript.tsconfigPaths", "tsconfig.json,src/tsconfig.json")
        .build(),
      ScannerRunnerConfig.builder().build()
    );
    assertThat(result.logOutput())
      .extracting(Log::message)
      .filteredOn(m -> m.startsWith("Found 2 tsconfig.json file(s)"))
      .hasSize(1);
    assertThat(result.scannerOutputReader().getProject().getAllIssues()).isEmpty();

    // Only src/tsconfig.json (with baseUrl) → module resolution succeeds → issue found
    var result2 = ScannerRunner.run(
      SERVER_CONTEXT,
      scanner.withScannerProperty("sonar.typescript.tsconfigPaths", "src/tsconfig.json").build(),
      ScannerRunnerConfig.builder().build()
    );
    assertThat(result2.logOutput())
      .extracting(Log::message)
      .filteredOn(m -> m.startsWith("Found 1 tsconfig.json file(s)"))
      .hasSize(1);

    var issues = result2
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    assertThat(issues)
      .extracting(TextRangeIssue::line, TextRangeIssue::componentPath)
      .containsExactlyInAnyOrder(tuple(4, "src/main.ts"));
  }

  /**
   * Test a project having a jsconfig.json for JavaScript files.
   * The analyzer doesn't search for 'jsconfig.json' files. So it will ignore any parameters impacting type checking (like baseUrl) which
   * will prevent the analyzer from finding the expected issue.
   */
  @Test
  void should_analyze_javascript_with_jsconfig() {
    var project = "jsconfig";
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      getSonarScannerBuilder(project).build(),
      ScannerRunnerConfig.builder().build()
    );

    assertThat(result.logOutput())
      .filteredOn(
        l ->
          l.level().equals(Log.Level.INFO) &&
          l.message().equals("2/2 source files have been analyzed")
      )
      .hasSize(1);
    Assertions.assertThat(result.scannerOutputReader().getProject().getAllIssues()).isEmpty(); // False negative

    var result2 = ScannerRunner.run(
      SERVER_CONTEXT,
      getSonarScannerBuilder(project)
        .withScannerProperty("sonar.typescript.tsconfigPaths", "src/jsconfig.json")
        .build(),
      ScannerRunnerConfig.builder().build()
    );
    assertThat(result.logOutput())
      .filteredOn(
        l ->
          l.level().equals(Log.Level.INFO) &&
          l.message().equals("2/2 source files have been analyzed")
      )
      .hasSize(1);
    Assertions.assertThat(result2.scannerOutputReader().getProject().getAllIssues()).isEmpty(); // False negative
  }

  @ParameterizedTest
  @EnumSource(Project.class)
  void should_analyze_with_zero_config(Project project) {
    var result = ScannerRunner.run(
      SERVER_CONTEXT,
      getSonarScannerBuilder(project.getName()).build(),
      ScannerRunnerConfig.builder().build()
    );

    assertThat(result.logOutput())
      .extracting(Log::message)
      .filteredOn(m ->
        m.startsWith(String.format("Found %d tsconfig.json file(s)", project.getExpectedFound()))
      )
      .hasSize(1);
    var issues = result
      .scannerOutputReader()
      .getProject()
      .getAllIssues()
      .stream()
      .filter(TextRangeIssue.class::isInstance)
      .map(TextRangeIssue.class::cast)
      .toList();
    Assertions.assertThat(issues)
      .extracting(TextRangeIssue::line, TextRangeIssue::componentPath)
      .containsExactlyInAnyOrder(project.getIssues());
  }

  private static String createName(String name) {
    return String.join("-", List.of(PROJECT_ROOT, name));
  }

  private static ScannerInput.Builder getSonarScannerBuilder(String directory) {
    var key = createName(directory);
    var projectDir = TestUtils.projectDir(PROJECT_ROOT).resolve(directory);

    return ScannerInput.create(key, projectDir).withScmDisabled();
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
      return Arrays.stream(filesWithIssue)
        .map(file -> tuple(ISSUE_LINE, file))
        .toArray(Tuple[]::new);
    }
  }
}
