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

import com.sonar.javascript.it.plugin.assertj.BuildResultAssert;
import com.sonar.javascript.it.plugin.assertj.Measures;
import com.sonar.javascript.it.plugin.assertj.MeasuresAssert;
import com.sonar.orchestrator.Orchestrator;
import com.sonar.orchestrator.build.BuildResult;
import com.sonar.orchestrator.build.SonarScanner;
import com.sonar.orchestrator.container.Edition;
import com.sonar.orchestrator.locator.FileLocation;
import com.sonar.orchestrator.locator.MavenLocation;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.Callable;
import java.util.function.Function;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.sonarqube.ws.Issues;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static java.lang.String.format;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class PRAnalysisTest {

  private static Orchestrator orchestrator;

  @TempDir
  private Path gitBaseDir;

  @ParameterizedTest
  @ValueSource(strings = {"js", "ts"})
  void should_analyse_js_ts_pull_requests(String language) {
    var testProject = TestProject.fromName(language);
    var projectKey = testProject.getProjectKey();
    var projectPath = gitBaseDir.resolve(projectKey).toAbsolutePath();

    OrchestratorStarter.setProfiles(orchestrator, projectKey, Map.of(testProject.getProfileName(), testProject.getLanguage()));

    try (var gitExecutor = testProject.createIn(projectPath)) {
      var indexFile = "index." + language;
      var helloFile = "hello." + language;

      gitExecutor.execute(git -> git.checkout().setName(Main.BRANCH));
      var buildResult = scanWith(getMasterScannerIn(projectPath, projectKey));
      BuildResultAssert.assertThat(buildResult)
        .withProjectKey(projectKey)
        .logsAtLeastOnce("DEBUG: Analysis of unchanged files will not be skipped (current analysis requires all files to be analyzed)")
        .logsOnce("DEBUG: Initializing linter \"default\"")
        .doesNotLog("DEBUG: Initializing linter \"unchanged\"")
        .cacheFileStrategy("WRITE_ONLY")
          .withReason("current analysis requires all files to be analyzed")
          .forFiles(indexFile, helloFile)
          .withCachedFilesCounts(1, 1)
          .isUsed()
        .logsOnce(format("%s\" with linterId \"default\"", indexFile))
        .logsTimes(Main.ANALYZER_REPORTED_ISSUES, "DEBUG: Saving issue for rule no-extra-semi")
        .logsOnce(format("%s\" with linterId \"default\"", helloFile))
        .logsOnce("INFO: Hit the cache for 0 out of 2", "Miss the cache for 2 out of 2: ANALYSIS_MODE_INELIGIBLE [2/2]")
        .generatesUcfgFilesForAll(projectPath, indexFile, helloFile);
      assertThat(getIssues(orchestrator, projectKey, Main.BRANCH, null))
        .hasSize(1)
        .extracting(Issues.Issue::getComponent)
        .contains(projectKey + ":" + indexFile);

      gitExecutor.execute(git -> git.checkout().setName(PR.BRANCH));
      BuildResultAssert.assertThat(scanWith(getBranchScannerIn(projectPath, projectKey)))
        .withProjectKey(projectKey)
        .logsAtLeastOnce("DEBUG: Files which didn't change will be part of UCFG generation only, other rules will not be executed")
        .logsOnce("DEBUG: Initializing linter \"default\"")
        .logsOnce("DEBUG: Initializing linter \"unchanged\"")
        .cacheFileStrategy("READ_AND_WRITE").forFiles(indexFile).withCachedFilesCounts(1).isUsed()
        .doesNotLog(format("%s\" with linterId \"unchanged\"", indexFile))
        .cacheFileStrategy("WRITE_ONLY")
          .withReason("the current file is changed")
          .forFiles(helloFile)
          .withCachedFilesCounts(1)
          .isUsed()
        .logsOnce(format("%s\" with linterId \"default\"", helloFile))
        .logsTimes(PR.ANALYZER_REPORTED_ISSUES, "DEBUG: Saving issue for rule no-extra-semi")
        .logsOnce("INFO: Hit the cache for 1 out of 2", "INFO: Miss the cache for 1 out of 2: FILE_CHANGED [1/2]")
        .generatesUcfgFilesForAll(projectPath, indexFile, helloFile);
      assertThat(getIssues(orchestrator, projectKey, null, PR.BRANCH))
        .hasSize(1)
        .extracting(Issues.Issue::getComponent)
        .contains(projectKey + ":" + helloFile);
    }
  }

  @Test
  void should_analyse_yaml_pull_requests() {
    var cloudformation = TestProject.YAML;
    var projectKey = cloudformation.getProjectKey();
    var projectPath = gitBaseDir.resolve(projectKey).toAbsolutePath();

    OrchestratorStarter.setProfiles(orchestrator, projectKey, Map.of(
      TestProject.JS.getProfileName(), TestProject.JS.getLanguage()
    ));

    try (var gitExecutor = cloudformation.createIn(projectPath)) {
      gitExecutor.execute(git -> git.checkout().setName(Main.BRANCH));
      BuildResultAssert.assertThat(scanWith(getMasterScannerIn(projectPath, projectKey)))
        .withProjectKey(projectKey)
        .logsAtLeastOnce("DEBUG: Analysis of unchanged files will not be skipped (current analysis requires all files to be analyzed)")
        .logsOnce("DEBUG: Initializing linter \"default\"")
        .doesNotLog("DEBUG: Initializing linter \"unchanged\"")
        .cacheFileStrategy("WRITE_ONLY")
          .withReason("current analysis requires all files to be analyzed")
          .forFiles("file1.yaml", "file2.yaml")
          .withCachedFilesCounts(1, 1)
          .isUsed()
        .logsOnce("file1.yaml\" with linterId \"default\"")
        .logsOnce("file2.yaml\" with linterId \"default\"")
        .logsOnce("INFO: Hit the cache for 0 out of 2", "Miss the cache for 2 out of 2: ANALYSIS_MODE_INELIGIBLE [2/2]")
        .generatesUcfgFilesForAll(projectPath, "file2_SomeLambdaFunction_yaml", "file1_SomeLambdaFunction_yaml");
      assertThat(getIssues(orchestrator, projectKey, Main.BRANCH, null))
        .isEmpty();

      gitExecutor.execute(git -> git.checkout().setName(PR.BRANCH));
      BuildResultAssert.assertThat(scanWith(getBranchScannerIn(projectPath, projectKey)))
        .withProjectKey(projectKey)
        .logsAtLeastOnce("DEBUG: Files which didn't change will be part of UCFG generation only, other rules will not be executed")
        .logsOnce("DEBUG: Initializing linter \"default\"")
        .logsOnce("DEBUG: Initializing linter \"unchanged\"")
        .cacheFileStrategy("READ_AND_WRITE").forFiles("file1.yaml").withCachedFilesCounts(1).isUsed()
        .doesNotLog("file1.yaml\" with linterId \"unchanged\"")
        .cacheFileStrategy("WRITE_ONLY")
          .withReason("the current file is changed")
          .forFiles("file2.yaml")
          .withCachedFilesCounts(1)
          .isUsed()
        .logsOnce("file2.yaml\" with linterId \"default\"")
        .logsTimes(PR.ANALYZER_REPORTED_ISSUES, "DEBUG: Saving issue for rule no-extra-semi")
        .logsOnce("INFO: Hit the cache for 1 out of 2", "INFO: Miss the cache for 1 out of 2: FILE_CHANGED [1/2]")
        .generatesUcfgFilesForAll(projectPath, "file2_SomeLambdaFunction_yaml", "file1_SomeLambdaFunction_yaml");
      assertThat(getIssues(orchestrator, projectKey, null, PR.BRANCH))
        .hasSize(1)
        .extracting(issue -> tuple(issue.getComponent(), issue.getRule()))
        .contains(tuple(projectKey + ":file2.yaml", "javascript:S1116"));
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"cpd-js", "cpd-ts"})
  void should_generate_cpds(String name) {
    var testProject = TestProject.fromName(name);
    var language = testProject.getLanguage();
    var projectKey = testProject.getProjectKey();
    var projectPath = gitBaseDir.resolve(projectKey).toAbsolutePath();

    OrchestratorStarter.setProfiles(orchestrator, projectKey, Map.of(testProject.getProfileName(), language));

    try (var gitExecutor = testProject.createIn(projectPath)) {
      gitExecutor.execute(git -> git.checkout().setName(Main.BRANCH));
      scanWith(getMasterScannerIn(projectPath, projectKey));

      MeasuresAssert.assertThat(getMeasures(projectKey + ":file1." + language, Main.BRANCH, null))
        .has("duplicated_lines", 30.0d)
        .has("duplicated_blocks", 1.0d)
        .has("duplicated_files", 1.0d)
        .has("duplicated_lines_density", 93.8d);

      MeasuresAssert.assertThat(getMeasures(projectKey + ":file2." + language, Main.BRANCH, null))
        .has("duplicated_lines", 30.0d)
        .has("duplicated_blocks", 1.0d)
        .has("duplicated_files", 1.0d)
        .has("duplicated_lines_density", 88.2d);

      MeasuresAssert.assertThat(getMeasures(projectKey, Main.BRANCH, null))
        .has("duplicated_lines", 60.0d)
        .has("duplicated_blocks", 2.0d)
        .has("duplicated_files", 2.0d)
        .has("duplicated_lines_density", 90.9d);

      gitExecutor.execute(git -> git.checkout().setName(PR.BRANCH));
      BuildResultAssert.assertThat(scanWith(getBranchScannerIn(projectPath, projectKey)))
        .logsTimes(2, "DEBUG: Processing cache analysis of file");

      MeasuresAssert.assertThat(getMeasures(projectKey + ":file3." + language, null, PR.BRANCH))
        .has("duplicated_lines", 31.0d)
        .has("duplicated_blocks", 2.0d)
        .has("duplicated_files", 1.0d)
        .has("duplicated_lines_density", 96.9d);

      MeasuresAssert.assertThat(getMeasures(projectKey, null, PR.BRANCH))
        .has("duplicated_lines", 92.0d)
        .has("duplicated_blocks", 5.0d)
        .has("duplicated_files", 3.0d)
        .has("duplicated_lines_density", 93.9d);
    }
  }

  private static Measures getMeasures(String componentKey, String branch, String pullRequest) {
    return new Measures(orchestrator, componentKey, branch, pullRequest);
  }

  @BeforeAll
  public static void startOrchestrator() {
    var builder = Orchestrator.builderEnv()
      .useDefaultAdminCredentialsForBuilds(true)
      .setSonarVersion(System.getProperty("sonar.runtimeVersion", "LATEST_RELEASE"))
      .addPlugin(JAVASCRIPT_PLUGIN_LOCATION)
      .setEdition(Edition.DEVELOPER).activateLicense()
      .addPlugin(MavenLocation.of("com.sonarsource.security", "sonar-security-plugin", "DEV"))
      .addPlugin(MavenLocation.of("com.sonarsource.security", "sonar-security-js-frontend-plugin", "DEV"))
      .addPlugin(MavenLocation.of("org.sonarsource.config", "sonar-config-plugin", "LATEST_RELEASE"));

    for (var projectTestCase : TestProject.values()) {
      builder.restoreProfileAtStartup(FileLocation.ofClasspath(projectTestCase.getProfileFile()));
    }

    orchestrator = builder.build();
    // Installation of SQ server in orchestrator is not thread-safe, so we need to synchronize
    synchronized (OrchestratorStarter.class) {
      orchestrator.start();
    }
  }

  @AfterAll
  public static void stopOrchestrator() {
    orchestrator.stop();
  }

  private static SonarScanner getMasterScannerIn(Path projectDir, String projectKey) {
    return getScanner(projectDir, projectKey).setProperty("sonar.branch.name", Main.BRANCH);
  }

  private static SonarScanner getBranchScannerIn(Path projectDir, String projectKey) {
    return getScanner(projectDir, projectKey)
      .setProperty("sonar.pullrequest.key", PR.BRANCH)
      .setProperty("sonar.pullrequest.branch", PR.BRANCH)
      .setProperty("sonar.pullrequest.base", Main.BRANCH);
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

  enum TestProject {

    JS("js", "js"),
    TS("ts", "ts"),
    YAML("yaml", "js"),
    CPD_JS("cpd-js", "js"),
    CPD_TS("cpd-ts", "ts");

    private final String name;
    private final String language;

    TestProject(String name, String language) {
      this.name = name;
      this.language = language;
    }

    static TestProject fromName(String name) {
      for (var value : values()) {
        if (value.name.equals(name)) {
          return value;
        }
      }
      throw new NoSuchElementException();
    }

    String getLanguage() {
      return language;
    }

    String getProjectKey() {
      return "pr-analysis-" + name;
    }

    String getProfileName() {
      return getProjectKey() + "-profile";
    }

    String getProfileFile() {
      return "/" + getProjectKey() + ".xml";
    }

    GitExecutor createIn(Path projectDir) {
      var mainProjectDir = TestUtils.projectDir(getProjectKey() + "-main");
      var branchProjectDir = TestUtils.projectDir(getProjectKey() + "-branch");
      var executor = new GitExecutor(projectDir);

      TestUtils.copyFiles(projectDir, mainProjectDir.toPath());
      executor.execute(git -> git.add().addFilepattern("."));
      executor.execute(git -> git.commit().setMessage("Create project"));

      executor.execute(git -> git.checkout().setCreateBranch(true).setName(PR.BRANCH));
      TestUtils.copyFiles(projectDir, branchProjectDir.toPath());
      executor.execute(git -> git.add().addFilepattern("."));
      executor.execute(git -> git.commit().setMessage("Refactor"));
      executor.execute(git -> git.checkout().setName(Main.BRANCH));

      return executor;
    }

  }

  static class GitExecutor implements AutoCloseable {

    private final Git git;

    GitExecutor(Path root) {
      try {
        git = Git.init()
          .setDirectory(Files.createDirectories(root).toFile())
          .setInitialBranch(Main.BRANCH)
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

  static class Main {
    static final String BRANCH = "main";
    static final int ANALYZER_REPORTED_ISSUES = 1;
  }

  static class PR {
    static final String BRANCH = "pr";
    static final int ANALYZER_REPORTED_ISSUES = 1;
  }
}
