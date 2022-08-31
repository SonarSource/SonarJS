/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2022 SonarSource SA
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
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.container.Edition;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.function.Function;
import java.util.function.Predicate;
import org.assertj.core.api.AbstractAssert;
import org.assertj.core.api.HamcrestCondition;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.hamcrest.CustomMatcher;
import org.hamcrest.Matcher;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static java.util.stream.Collectors.toList;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OrchestratorStarter.class)
class PRAnalysisTest {

  private static Orchestrator orchestrator;

  @TempDir
  private Path gitBaseDir;

  @BeforeAll
  public static void startOrchestrator() {
    orchestrator = OrchestratorStarter.getOrchestratorBuilder()
      .setEdition(Edition.DEVELOPER).activateLicense()
      .addPlugin(MavenLocation.of("com.sonarsource.security", "sonar-security-plugin", "LATEST_RELEASE"))
      .addPlugin(MavenLocation.of("com.sonarsource.security", "sonar-security-js-frontend-plugin", "LATEST_RELEASE"))
      .addPlugin(MavenLocation.of("com.sonarsource.security", "sonar-security-php-frontend-plugin", "LATEST_RELEASE"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/pr-analysis-js.xml"))
      .restoreProfileAtStartup(FileLocation.ofClasspath("/pr-analysis-ts.xml"))
      .build();
    // Installation of SQ server in orchestrator is not thread-safe, so we need to synchronize
    synchronized (OrchestratorStarter.class) {
      orchestrator.start();
    }
  }

  @AfterAll
  public static void stopOrchestrator() {
    orchestrator.stop();
  }

  private static GitExecutor createProjectIn(Path root, String language) {
    var executor = new GitExecutor(root);
    var generator = new FileGenerator(root);
    var helloFile = "hello." + language;
    var indexFile = "index." + language;

    if ("ts".equals(language)) {
      generator.write("package.json", Master.PACKAGE_JSON_TS);
      generator.write("tsconfig.json", Master.TSCONFIG_JSON);
    } else {
      generator.write("package.json", Master.PACKAGE_JSON_JS);
    }
    generator.write(helloFile, Master.HELLO);
    generator.write(indexFile, Master.INDEX);
    executor.execute(git -> git.add().addFilepattern("."));
    executor.execute(git -> git.commit().setMessage("Create project"));

    executor.execute(git -> git.checkout().setCreateBranch(true).setName(PR.BRANCH));
    generator.write(helloFile, PR.HELLO);
    executor.execute(git -> git.add().addFilepattern("."));
    executor.execute(git -> git.commit().setMessage("Refactor"));
    executor.execute(git -> git.checkout().setName(Master.BRANCH));

    return executor;
  }

  private static SonarScanner getMasterScannerIn(Path projectDir, String projectKey) {
    return getScanner(projectDir, projectKey).setProperty("sonar.branch.name", Master.BRANCH);
  }

  private static SonarScanner getBranchScannerIn(Path projectDir, String projectKey) {
    return getScanner(projectDir, projectKey)
      .setProperty("sonar.pullrequest.key", PR.BRANCH)
      .setProperty("sonar.pullrequest.branch", PR.BRANCH)
      .setProperty("sonar.pullrequest.base", Master.BRANCH);
  }

  private static SonarScanner getScanner(Path projectDir, String projectKey) {
    return getSonarScanner()
      .setProjectKey(projectKey)
      .setSourceEncoding("UTF-8")
      .setDebugLogs(true)
      .setSourceDirs(".")
      .setProjectDir(projectDir.toFile())
      .setProperty("sonar.scm.provider", "git")
      .setProperty("sonar.scm.disabled", "false");
  }

  private static BuildResult scanWith(SonarScanner scanner) {
    var result = orchestrator.executeBuild(scanner);
    assertThat(result.isSuccess()).isTrue();
    return result;
  }

  private static List<Path> findUcfgFilesIn(Path projectPath) throws IOException {
    try (var stream = Files.find(projectPath.resolve(".scannerwork"), 3, PRAnalysisTest::isUcfgFile)) {
      return stream.collect(toList());
    }
  }

  private static boolean isUcfgFile(Path path, BasicFileAttributes attrs) {
    return attrs.isRegularFile() && path.getFileName().toString().endsWith(".ucfg");
  }

  @ParameterizedTest
  @ValueSource(strings = {"js", "ts"})
  void should_analyse_pull_requests(String language) throws IOException {
    var projectKey = "pr-analysis-" + language;
    var projectPath = gitBaseDir.resolve(projectKey).toAbsolutePath();

    OrchestratorStarter.setProfiles(orchestrator, projectKey, Map.of(
      "pr-analysis-js-profile", "js",
      "pr-analysis-ts-profile", "ts"));

    try (var gitExecutor = createProjectIn(projectPath, language)) {
      gitExecutor.execute(git -> git.checkout().setName(Master.BRANCH));
      BuildResultAssert.assertThat(scanWith(getMasterScannerIn(projectPath, projectKey)))
        .hasLogs("DEBUG: Saving issue for rule no-extra-semi", Master.ANALYZER_REPORTED_ISSUES)
        .hasLog(String.format("INFO: %1$d/%1$d source files have been analyzed", Master.SOURCE_FILES))
        .hasAtLeastLog("INFO: Won't skip unchanged files as this is not activated in the sensor context")
        .hasLog("DEBUG: initializing linter \"default\"")
        .hasNotLog("DEBUG: initializing linter \"unchanged\"")
        .hasLogs("analyzing file linterId=default", Master.SOURCE_FILES);
      assertThat(getIssues(orchestrator, projectKey, null))
        .hasSize(1)
        .extracting(Issues.Issue::getComponent)
        .contains(projectKey + ":index." + language);
      assertThat(findUcfgFilesIn(projectPath)).isNotEmpty();

      gitExecutor.execute(git -> git.checkout().setName(PR.BRANCH));
      BuildResultAssert.assertThat(scanWith(getBranchScannerIn(projectPath, projectKey)))
        .hasLogs("DEBUG: Saving issue for rule no-extra-semi", PR.ANALYZER_REPORTED_ISSUES)
        .hasLog(String.format("INFO: %1$d/%1$d source files have been analyzed", PR.SOURCE_FILES))
        .hasAtLeastLog("Will skip unchanged files")
        .hasLog("DEBUG: initializing linter \"default\"")
        .hasLog("DEBUG: initializing linter \"unchanged\"")
        .hasLog("analyzing file linterId=unchanged")
        .hasLog("analyzing file linterId=default");
      assertThat(getIssues(orchestrator, projectKey, PR.BRANCH))
        .hasSize(1)
        .extracting(Issues.Issue::getComponent)
        .contains(projectKey + ":hello." + language);
      assertThat(findUcfgFilesIn(projectPath)).isNotEmpty();
    }
  }

  static class BuildResultAssert extends AbstractAssert<BuildResultAssert, BuildResult> {

    BuildResultAssert(BuildResult actual) {
      super(actual, BuildResultAssert.class);
    }

    static BuildResultAssert assertThat(BuildResult buildResult) {
      return new BuildResultAssert(buildResult);
    }

    private static Matcher<BuildResult> logMatcher(String description, String log, Predicate<Integer> predicate) {
      return new CustomMatcher<>(description) {
        @Override
        public boolean matches(Object item) {
          return Optional.ofNullable(item)
            .filter(BuildResult.class::isInstance)
            .map(BuildResult.class::cast)
            .map(result -> result.getLogsLines(line -> line.contains(log)).size())
            .filter(predicate)
            .isPresent();
        }
      };
    }

    BuildResultAssert hasLog(String log) {
      return hasLogs(log, 1);
    }

    BuildResultAssert hasNotLog(String log) {
      return hasLogs(log, 0);
    }

    BuildResultAssert hasLogs(String log, int times) {
      return has(new HamcrestCondition<>(logMatcher(String.format("has logs [%s] %d time(s)", log, times), log, n -> n == times)));
    }

    BuildResultAssert hasAtLeastLog(String log) {
      return has(new HamcrestCondition<>(logMatcher(String.format("has at least log [%s]", log), log, n -> n > 0)));
    }
  }

  static class FileGenerator {

    private final Path root;

    FileGenerator(Path root) {
      this.root = root;
    }

    void write(String name, List<String> lines) {
      try {
        Files.write(root.resolve(name), lines, StandardCharsets.UTF_8);
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
    }

  }

  static class GitExecutor implements AutoCloseable {

    private final Git git;

    GitExecutor(Path root) {
      try {
        git = Git.init()
          .setDirectory(Files.createDirectories(root).toFile())
          .setInitialBranch(Master.BRANCH)
          .call();
      } catch (IOException | GitAPIException e) {
        throw new RuntimeException(e);
      }
    }

    <T> void execute(Function<Git, Callable<T>> f) {
      try {
        f.apply(git).call();
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    }

    public void close() {
      git.close();
    }

  }

  static class Master {
    static final String BRANCH = "master";
    static final List<String> PACKAGE_JSON_JS = List.of("{\"name\":\"pr-analysis-js\",\"version\":\"1.0.0\",\"main\":\"index.js\"}");
    static final List<String> PACKAGE_JSON_TS = List.of(
      "{",
      "\"name\":\"pr-analysis-ts\",",
      "\"version\":\"1.0.0\",",
      "\"main\":\"index.ts\",",
      "\"devDependencies\":{\"@types/node\":\"^18.7.13\"}",
      "}");
    static final List<String> TSCONFIG_JSON = List.of("{\"files\":[\"index.ts\",\"hello.ts\"]}");
    static final List<String> HELLO = List.of(
      "exports.hello = function(name) {",
      "  console.log(`Hello, ${name}!`);",
      "};");
    static final List<String> INDEX = List.of(
      "const { hello } = require('./hello');",
      "hello('World');;"); // Extra semicolon issue expected here.
    static final int SOURCE_FILES = 2;
    static final int ANALYZER_REPORTED_ISSUES = 1;
  }

  static class PR {
    static final String BRANCH = "pr";
    static final List<String> HELLO = List.of(
      "exports.hello = function(name) {",
      "  console.log('Starting...');;", // Extra semicolon issue expected here.
      "  setTimeout(() => {",
      "    console.log(`Hello, ${name.toUpperCase()}!`);",
      "    setTimeout(() => console.log('Stopped!'), 100);",
      "  }, sleep);",
      "}");
    static final int SOURCE_FILES = 2;
    static final int ANALYZER_REPORTED_ISSUES = 1;
  }
}
