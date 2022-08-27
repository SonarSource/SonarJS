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
import com.sonar.orchestrator.build.SonarScanner;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.function.Function;
import org.apache.commons.lang.time.StopWatch;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;

import static com.sonar.javascript.it.plugin.OrchestratorStarter.getIssues;
import static com.sonar.javascript.it.plugin.OrchestratorStarter.getSonarScanner;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OrchestratorStarter.class)
class PullRequestAnalysisTest {

  private static final String PROJECT_KEY = "pr-analysis";

  private static final Orchestrator orchestrator = OrchestratorStarter.ORCHESTRATOR;

  private final StopWatch stopWatch = new StopWatch();

  private final List<Long> scanTimes = new ArrayList<>();

  private GitExecutor gitExecutor;

  @TempDir
  private Path gitBaseDir;

  private Path getProjectDir() {
    return gitBaseDir.resolve(PROJECT_KEY).toAbsolutePath();
  }

  @BeforeAll
  static void setProfile() {
    OrchestratorStarter.setProfile(PROJECT_KEY, "nosonar-profile", "js");
  }

  @BeforeEach
  void setUp() {
    gitExecutor = createProject(getProjectDir());
  }

  private static GitExecutor createProject(Path root) {
    var generator = new FileGenerator(root);
    var executor = new GitExecutor(root);

    generator.write("package.json", Main.PACKAGE_JSON);
    generator.write("hello.js", Main.HELLO_JS);
    generator.write("index.js", Main.INDEX_JS);
    executor.execute(git -> git.add().addFilepattern("."));
    executor.execute(git -> git.commit().setMessage("Create project"));

    executor.execute(git -> git.checkout().setCreateBranch(true).setName(PR1.BRANCH));
    generator.write("hello.js", PR1.HELLO_JS);
    generator.write("index.js", PR1.INDEX_JS);
    executor.execute(git -> git.add().addFilepattern("."));
    executor.execute(git -> git.commit().setMessage("Refactor"));
    executor.execute(git -> git.checkout().setName(Main.BRANCH));

    executor.execute(git -> git.checkout().setCreateBranch(true).setName(PR2.BRANCH));
    generator.write("hello.js", PR2.HELLO_JS);
    executor.execute(git -> git.commit().setAll(true).setMessage("Use upper-case"));
    executor.execute(git -> git.checkout().setName(Main.BRANCH));

    return executor;
  }

  @AfterEach
  void tearDown() {
    gitExecutor.close();
  }

  @Test
  void should_analyse_pull_requests() {
    gitExecutor.execute(git -> git.checkout().setName(Main.BRANCH));
    scanWith(getMainScanner());
    assertThat(getIssues(PROJECT_KEY + ":hello.js")).isEmpty();

    gitExecutor.execute(git -> git.checkout().setName(PR1.BRANCH));
    scanWith(getBranchScanner(PR1.BRANCH));
    assertThat(getIssues(PROJECT_KEY + ":hello.js", PR1.BRANCH)).hasSize(1);

    gitExecutor.execute(git -> git.checkout().setName(PR2.BRANCH));
    scanWith(getBranchScanner(PR2.BRANCH));
    assertThat(getIssues(PROJECT_KEY + ":hello.js", PR2.BRANCH)).isEmpty();

    Collections.reverse(scanTimes);
    assertThat(scanTimes).allMatch(time -> time > 0L);
  }

  private SonarScanner getMainScanner() {
    return getScanner().setProperty("sonar.branch.name", Main.BRANCH);
  }

  private SonarScanner getBranchScanner(String branch) {
    return getScanner()
      .setProperty("sonar.pullrequest.key", branch)
      .setProperty("sonar.pullrequest.branch", branch)
      .setProperty("sonar.pullrequest.base", Main.BRANCH);
  }

  private SonarScanner getScanner() {
    return getSonarScanner()
      .setProjectKey(PROJECT_KEY)
      .setSourceEncoding("UTF-8")
      .setSourceDirs(".")
      .setProjectDir(getProjectDir().toFile())
      .setProperty("sonar.scm.provider", "git")
      .setProperty("sonar.scm.disabled", "false")
      .setProperty("sonar.analysisCache.enabled", "true");
  }

  private void scanWith(SonarScanner scanner) {
    stopWatch.reset();
    stopWatch.start();
    var result = orchestrator.executeBuild(scanner);
    stopWatch.stop();
    scanTimes.add(stopWatch.getTime());
    assertThat(result.isSuccess()).isTrue();
    assertThat(result.getLogsLines("INFO: 2 source files to be analyzed"::equals)).hasSize(1);
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
    static final List<String> PACKAGE_JSON = List.of("{\"name\":\"pr-analysis-test\",\"version\":\"1.0.0\",\"main\":\"index.js\"}");
    static final List<String> HELLO_JS = List.of(
      "exports.hello = function(name) {",
      "  return `Hello, ${name}!`;",
      "};");
    static final List<String> INDEX_JS = List.of(
      "const { hello } = require('./hello');",
      "console.log(hello('World'));");
  }

  static class PR1 {
    static final String BRANCH = "pr1";
    static final List<String> HELLO_JS = List.of(
      "exports.hello = function(name, sleep, handler) {",
      "  handler('Starting...');;",
      "  setTimeout(() => {",
      "    handler(`Hello, ${name.toUpperCase()}!`);",
      "    setTimeout(() => handler('Stopped!'), sleep);",
      "  }, sleep);",
      "}");
    static final List<String> INDEX_JS = List.of(
      "const { hello } = require('./hello');",
      "hello(process.argv[2], 100, console.log)");
  }

  static class PR2 {
    static final String BRANCH = "pr2";
    static final List<String> HELLO_JS = List.of(
      "exports.hello = function(name) {",
      "  return `Hello, ${name.toUpperCase()}!`;",
      "};");
  }

}
