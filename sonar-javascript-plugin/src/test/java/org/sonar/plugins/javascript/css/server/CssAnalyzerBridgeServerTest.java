/*
 * SonarCSS
 * Copyright (C) 2018-2021 SonarSource SA
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
package org.sonar.css.plugin.server;

import java.io.File;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.awaitility.Awaitility;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.internal.JUnitTempFolder;
import org.sonar.api.utils.log.LogTester;
import org.sonar.css.plugin.server.CssAnalyzerBridgeServer.Issue;
import org.sonar.css.plugin.server.CssAnalyzerBridgeServer.Request;
import org.sonar.css.plugin.server.bundle.Bundle;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;
import org.sonarsource.nodejs.NodeCommandException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.sonar.api.utils.log.LoggerLevel.DEBUG;
import static org.sonar.api.utils.log.LoggerLevel.ERROR;
import static org.sonar.api.utils.log.LoggerLevel.INFO;
import static org.sonar.api.utils.log.LoggerLevel.WARN;

public class CssAnalyzerBridgeServerTest {

  private static final String START_SERVER_SCRIPT = "startServer.js";
  private static final String CONFIG_FILE = "config.json";
  private static final int TEST_TIMEOUT_SECONDS = 1;
  private static final SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarQube(Version.create(8, 5), SonarQubeSide.SCANNER, SonarEdition.COMMUNITY);
  private static final NodeDeprecationWarning deprecationWarning = new NodeDeprecationWarning(sonarRuntime);

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @org.junit.Rule
  public final ExpectedException thrown = ExpectedException.none();

  @org.junit.Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  private SensorContextTester context;
  private CssAnalyzerBridgeServer cssAnalyzerBridgeServer;

  @Before
  public void setUp() throws Exception {
    context = SensorContextTester.create(tempFolder.newDir());
    context.fileSystem().setWorkDir(tempFolder.newDir().toPath());
  }

  @After
  public void tearDown() throws Exception {
    if (cssAnalyzerBridgeServer != null) {
      cssAnalyzerBridgeServer.clean();
    }
  }

  @Test
  public void default_timeout() {
    CssAnalyzerBridgeServer server = new CssAnalyzerBridgeServer(mock(Bundle.class), null, deprecationWarning);
    assertThat(server.timeoutSeconds).isEqualTo(60);
  }

  @Test
  public void issue_constructor() {
    Issue issue = new Issue(2, "r", "t");
    assertThat(issue.line).isEqualTo(2);
    assertThat(issue.rule).isEqualTo("r");
    assertThat(issue.text).isEqualTo("t");
  }

  @Test
  public void should_throw_when_not_existing_start_script() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer("NOT_EXISTING.js");

    thrown.expect(NodeCommandException.class);
    thrown.expectMessage("Node.js script to start css-bundle server doesn't exist");

    cssAnalyzerBridgeServer.startServer(context);
  }

  @Test
  public void should_return_false_if_failed_to_build_node_command() throws Exception {
    context.fileSystem().add(new TestInputFileBuilder("moduleKey", "file.css")
      .setLanguage("css")
      .build());

    NodeCommandBuilder nodeCommandBuilder = mock(NodeCommandBuilder.class, invocation -> {
      if (NodeCommandBuilder.class.equals(invocation.getMethod().getReturnType())) {
        return invocation.getMock();
      } else {
        throw new NodeCommandException("msg");
      }
    });

    AnalysisWarnings analysisWarnings = mock(AnalysisWarnings.class);
    cssAnalyzerBridgeServer = new CssAnalyzerBridgeServer(nodeCommandBuilder, TEST_TIMEOUT_SECONDS, new TestBundle(START_SERVER_SCRIPT), analysisWarnings, deprecationWarning);
    assertThat(cssAnalyzerBridgeServer.startServerLazily(context)).isFalse();
    assertThat(logTester.logs(ERROR)).contains("CSS rules were not executed. msg");
    verify(analysisWarnings).addUnique("CSS rules were not executed. msg");
  }

  @Test
  public void should_forward_process_streams() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer("testLogs.js");
    cssAnalyzerBridgeServer.startServerLazily(context);

    assertThat(logTester.logs(DEBUG)).contains("testing debug log");
    assertThat(logTester.logs(WARN)).contains("testing warn log");
    assertThat(logTester.logs(INFO)).contains("testing info log");
    assertThat(logTester.logs(ERROR)).contains("testing error log");
  }

  @Test
  public void should_get_answer_from_server() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer();
    cssAnalyzerBridgeServer.startServerLazily(context);

    Request request = new Request("/absolute/path/file.css", null, CONFIG_FILE);
    Issue[] issues = cssAnalyzerBridgeServer.analyze(request);
    assertThat(issues).hasSize(1);
    assertThat(issues[0].line).isEqualTo(2);
    assertThat(issues[0].rule).isEqualTo("block-no-empty");
    assertThat(issues[0].text).isEqualTo("Unexpected empty block");

    request = new Request("/absolute/path/empty.css", null, CONFIG_FILE);
    issues = cssAnalyzerBridgeServer.analyze(request);
    assertThat(issues).isEmpty();
  }

  @Test
  public void should_throw_if_failed_to_start() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer("throw.js");
    assertThat(cssAnalyzerBridgeServer.startServerLazily(context)).isFalse();
    assertThat(logTester.logs(WARN)).contains("CSS rules were not executed. Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)");
  }

  @Test
  public void should_return_command_info() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer();
    assertThat(cssAnalyzerBridgeServer.getCommandInfo()).isEqualTo("Node.js command to start css-bundle server was not built yet.");

    cssAnalyzerBridgeServer.startServerLazily(context);
    assertThat(cssAnalyzerBridgeServer.getCommandInfo()).contains("Node.js command to start css-bundle was: ", "node", START_SERVER_SCRIPT);
    assertThat(cssAnalyzerBridgeServer.getCommandInfo()).doesNotContain("--max-old-space-size");
  }

  @Test
  public void should_set_max_old_space_size() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer();
    context.setSettings(new MapSettings().setProperty("sonar.css.node.maxspace", 2048));
    cssAnalyzerBridgeServer.startServerLazily(context);
    assertThat(cssAnalyzerBridgeServer.getCommandInfo()).contains("--max-old-space-size=2048");
  }

  @Test
  public void test_isAlive() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer();
    assertThat(cssAnalyzerBridgeServer.isAlive()).isFalse();
    cssAnalyzerBridgeServer.startServerLazily(context);
    assertThat(cssAnalyzerBridgeServer.isAlive()).isTrue();
    cssAnalyzerBridgeServer.stop();
    assertThat(cssAnalyzerBridgeServer.isAlive()).isFalse();
  }

  @Test
  public void test_lazy_start() throws Exception {
    String alreadyStarted = "css-bundle server is up, no need to start.";
    String starting = "Starting Node.js process to start css-bundle server at port";
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer();
    cssAnalyzerBridgeServer.startServerLazily(context);
    assertThat(logTester.logs(DEBUG).stream().anyMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    logTester.clear();
    cssAnalyzerBridgeServer.startServerLazily(context);
    assertThat(logTester.logs(DEBUG).stream().noneMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).contains(alreadyStarted);
  }

  @Test
  public void should_return_false_and_log_when_failed_already() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer("throw.js");
    String failedToStartExceptionMessage = "CSS rules were not executed. Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)";

    assertThat(cssAnalyzerBridgeServer.startServerLazily(context)).isFalse();
    assertThat(logTester.logs(WARN)).contains(failedToStartExceptionMessage);

    assertThat(cssAnalyzerBridgeServer.startServerLazily(context)).isFalse();
    assertThat(logTester.logs(DEBUG)).contains("Skipping start of css-bundle server due to the failure during first analysis",
      "Skipping execution of CSS rules due to the problems with css-bundle server");
  }

  @Test
  public void should_log_warning_when_failed_to_close() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer("failedClose.js");
    cssAnalyzerBridgeServer.startServerLazily(context);
    cssAnalyzerBridgeServer.stop();
    assertThat(logTester.logs(WARN)).contains("Failed to close stylelint-bridge server");
  }


  @Test
  public void should_fail_if_bad_json_response() throws Exception {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer(START_SERVER_SCRIPT);
    cssAnalyzerBridgeServer.deploy(context.fileSystem().workDir());
    cssAnalyzerBridgeServer.startServerLazily(context);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "invalid-json-response.css")
      .build();
    Request request = new Request(inputFile.absolutePath(), null, CONFIG_FILE);
    assertThatThrownBy(() -> cssAnalyzerBridgeServer.analyze(request)).isInstanceOf(IllegalStateException.class);
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void waitServerToStart_can_be_interrupted() throws InterruptedException {
    cssAnalyzerBridgeServer = createCssAnalyzerBridgeServer(START_SERVER_SCRIPT);
    // try to connect to a port that does not exists
    Thread worker = new Thread(() -> cssAnalyzerBridgeServer.waitServerToStart(1000));
    worker.start();
    Awaitility.setDefaultTimeout(1, TimeUnit.SECONDS);
    // wait for the worker thread to start and to be blocked on Thread.sleep(20);
    await().until(() -> worker.getState() == Thread.State.TIMED_WAITING);

    long start = System.currentTimeMillis();
    worker.interrupt();
    worker.join();
    long timeToInterrupt = System.currentTimeMillis() - start;
    assertThat(timeToInterrupt).isLessThan(20);
  }



  public static CssAnalyzerBridgeServer createCssAnalyzerBridgeServer(String startServerScript) {
    CssAnalyzerBridgeServer server = new CssAnalyzerBridgeServer(NodeCommand.builder(), TEST_TIMEOUT_SECONDS, new TestBundle(startServerScript), null, deprecationWarning);
    server.start();
    return server;
  }

  public static CssAnalyzerBridgeServer createCssAnalyzerBridgeServer() {
    return createCssAnalyzerBridgeServer(START_SERVER_SCRIPT);
  }

  static class TestBundle implements Bundle {

    final String startServerScript;

    TestBundle(String startServerScript) {
      this.startServerScript = startServerScript;
    }

    @Override
    public void deploy(Path deployLocation) {
      // no-op for unit test
    }

    @Override
    public String startServerScript() {
      return "src/test/resources/mock-start-server/" + startServerScript;
    }

    @Override
    public String resolve(String relativePath) {
      File file = new File("src/test/resources");
      return new File(file.getAbsoluteFile(), relativePath).getAbsolutePath();
    }
  }
}
