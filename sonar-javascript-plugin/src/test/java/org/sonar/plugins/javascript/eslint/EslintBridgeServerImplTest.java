/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import org.awaitility.Awaitility;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.sonar.api.SonarEdition;
import org.sonar.api.SonarQubeSide;
import org.sonar.api.SonarRuntime;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.internal.JUnitTempFolder;
import org.sonar.api.utils.log.LogTester;
import org.sonar.plugins.javascript.api.RulesBundle;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;
import org.sonarsource.nodejs.NodeCommandException;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.mock;
import static org.sonar.api.utils.log.LoggerLevel.DEBUG;
import static org.sonar.api.utils.log.LoggerLevel.ERROR;
import static org.sonar.api.utils.log.LoggerLevel.INFO;
import static org.sonar.api.utils.log.LoggerLevel.WARN;

public class EslintBridgeServerImplTest {

  private static final String START_SERVER_SCRIPT = "startServer.js";
  private static final int TEST_TIMEOUT_SECONDS = 1;

  @org.junit.Rule
  public LogTester logTester = new LogTester();

  @org.junit.Rule
  public JUnitTempFolder tempFolder = new JUnitTempFolder();

  private SensorContextTester context;
  private EslintBridgeServerImpl eslintBridgeServer;
  private final TestBundle testBundle = new TestBundle(START_SERVER_SCRIPT);

  private final RulesBundles emptyRulesBundles = new RulesBundles(new RulesBundle[] {}, tempFolder);
  private final SonarRuntime sonarRuntime = SonarRuntimeImpl.forSonarQube(Version.create(8, 5), SonarQubeSide.SCANNER, SonarEdition.COMMUNITY);
  private final NodeDeprecationWarning deprecationWarning = new NodeDeprecationWarning(sonarRuntime);

  @Before
  public void setUp() throws Exception {
    context = SensorContextTester.create(tempFolder.newDir());
    context.fileSystem().setWorkDir(tempFolder.newDir().toPath());
  }

  @After
  public void tearDown() throws Exception {
    try {
      if (eslintBridgeServer != null) {
        eslintBridgeServer.clean();
      }
    } catch (Exception e) {
      // ignore
      e.printStackTrace();
    }
  }

  @Test
  public void should_throw_when_not_existing_script() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("NOT_EXISTING.js");
    eslintBridgeServer.deploy();

    assertThatThrownBy(() -> eslintBridgeServer.startServer(context, emptyList()))
      .isInstanceOf(NodeCommandException.class)
      .hasMessageStartingWith("Node.js script to start eslint-bridge server doesn't exist:");
  }

  @Test
  public void should_throw_if_failed_to_build_node_command() throws Exception {
    NodeCommandBuilder nodeCommandBuilder = mock(NodeCommandBuilder.class, invocation -> {
      if (NodeCommandBuilder.class.equals(invocation.getMethod().getReturnType())) {
        return invocation.getMock();
      } else {
        throw new NodeCommandException("msg");
      }
    });

    eslintBridgeServer = new EslintBridgeServerImpl(nodeCommandBuilder, TEST_TIMEOUT_SECONDS, testBundle, emptyRulesBundles, deprecationWarning);
    eslintBridgeServer.deploy();

    assertThatThrownBy(() -> eslintBridgeServer.startServer(context, emptyList()))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("msg");
  }

  @Test
  public void should_forward_process_streams() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("logging.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    assertThat(logTester.logs(DEBUG)).contains("testing debug log");
    assertThat(logTester.logs(WARN)).contains("testing warn log");
    assertThat(logTester.logs(INFO)).contains("testing info log");
  }

  @Test
  public void should_get_answer_from_server() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    AnalysisRequest request = new AnalysisRequest(inputFile.absolutePath(), null, true, null);
    assertThat(eslintBridgeServer.analyzeJavaScript(request).issues).isEmpty();
  }

  @Test
  public void test_init() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    EslintBridgeServer.Rule[] rules = {new EslintBridgeServer.Rule("key", singletonList("config"))};
    eslintBridgeServer.initLinter(rules);
    eslintBridgeServer.stop();
    assertThat(logTester.logs()).contains("{\"rules\":[{\"key\":\"key\",\"configurations\":[\"config\"]}],\"environments\":[],\"globals\":[]}");
  }

  @Test
  public void should_get_answer_from_server_for_ts_request() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.ts")
      .setContents("alert('Fly, you fools!')")
      .build();
    DefaultInputFile tsConfig = TestInputFileBuilder.create("foo", "tsconfig.json")
      .setContents("{\"compilerOptions\": {\"target\": \"es6\", \"allowJs\": true }}")
      .build();
    AnalysisRequest request = new AnalysisRequest(inputFile.absolutePath(), null, true,
      singletonList(tsConfig.absolutePath()));
    assertThat(eslintBridgeServer.analyzeTypeScript(request).issues).isEmpty();
  }

  @Test
  public void should_throw_if_failed_to_start() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("throw.js");
    eslintBridgeServer.deploy();

    assertThatThrownBy(() -> eslintBridgeServer.startServer(context, emptyList()))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)");
  }

  @Test
  public void should_return_command_info() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo()).isEqualTo("Node.js command to start eslint-bridge server was not built yet.");

    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    assertThat(eslintBridgeServer.getCommandInfo()).contains("Node.js command to start eslint-bridge was: ", "node", START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo()).doesNotContain("--max-old-space-size");
  }

  @Test
  public void should_set_max_old_space_size() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo()).isEqualTo("Node.js command to start eslint-bridge server was not built yet.");

    eslintBridgeServer.deploy();
    context.setSettings(new MapSettings().setProperty("sonar.javascript.node.maxspace", 2048));
    eslintBridgeServer.startServer(context, emptyList());

    assertThat(eslintBridgeServer.getCommandInfo()).contains("--max-old-space-size=2048");
  }

  @Test
  public void should_set_allowTsParserJsFiles_to_false() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    context.setSettings(new MapSettings().setProperty("sonar.javascript.allowTsParserJsFiles", "false"));
    eslintBridgeServer.startServer(context, emptyList());
    eslintBridgeServer.stop();

    assertThat(logTester.logs()).contains("allowTsParserJsFiles: false");
  }

  @Test
  public void allowTsParserJsFiles_default_value_is_true() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());
    eslintBridgeServer.stop();

    assertThat(logTester.logs()).contains("allowTsParserJsFiles: true");
  }

  @Test
  public void test_isAlive() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.isAlive()).isFalse();
    eslintBridgeServer.startServerLazily(context);
    assertThat(eslintBridgeServer.isAlive()).isTrue();
    eslintBridgeServer.clean();
    assertThat(eslintBridgeServer.isAlive()).isFalse();
  }

  @Test
  public void test_lazy_start() throws Exception {
    String alreadyStarted = "eslint-bridge server is up, no need to start.";
    String starting = "Starting Node.js process to start eslint-bridge server at port";
    eslintBridgeServer = createEslintBridgeServer("startServer.js");
    eslintBridgeServer.startServerLazily(context);
    assertThat(logTester.logs(DEBUG).stream().anyMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    logTester.clear();
    eslintBridgeServer.startServerLazily(context);
    assertThat(logTester.logs(DEBUG).stream().noneMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).contains(alreadyStarted);
  }

  @Test
  public void should_throw_special_exception_when_failed_already() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("throw.js");
    String failedToStartExceptionMessage = "Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)";
    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage(failedToStartExceptionMessage);

    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(ServerAlreadyFailedException.class);
  }

  @Test
  public void should_fail_if_bad_json_response() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("badResponse.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServerLazily(context);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    AnalysisRequest request = new AnalysisRequest(inputFile.absolutePath(), null, true, null);
    assertThatThrownBy(() -> eslintBridgeServer.analyzeJavaScript(request)).isInstanceOf(IllegalStateException.class);
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  public void should_not_search_typescript_when_no_ts_file() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    Path baseDir = tempFolder.newDir().toPath();
    SensorContextTester ctx = SensorContextTester.create(baseDir);
    ctx.fileSystem().setWorkDir(tempFolder.newDir().toPath());
    Path tsDir = baseDir.resolve("dir/node_modules/typescript");
    Files.createDirectories(tsDir);
    eslintBridgeServer.startServer(ctx, emptyList());
    assertThat(eslintBridgeServer.getCommandInfo()).doesNotContain("NODE_PATH");
  }

  @Test
  public void should_reload_tsconfig() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());
    assertThat(eslintBridgeServer.newTsConfig()).isTrue();
  }

  @Test
  public void should_return_files_for_tsconfig() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());
    String tsconfig = "path/to/tsconfig.json";
    EslintBridgeServerImpl.TsConfigResponse tsConfigResponse = eslintBridgeServer.tsConfigFiles(tsconfig);
    assertThat(tsConfigResponse.files).contains("abs/path/file1", "abs/path/file2", "abs/path/file3");
    assertThat(tsConfigResponse.error).isNull();

    TsConfigFile tsConfigFile = eslintBridgeServer.loadTsConfig(tsconfig);
    assertThat(tsConfigFile.files).contains("abs/path/file1", "abs/path/file2", "abs/path/file3");
    assertThat(tsConfigFile.filename).isEqualTo(tsconfig);
  }

  @Test
  public void should_return_no_files_for_tsconfig_bad_response() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("badResponse.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());
    EslintBridgeServerImpl.TsConfigResponse response = eslintBridgeServer.tsConfigFiles("path/to/tsconfig.json");
    assertThat(response.files).isEmpty();
    assertThat(response.error).isEqualTo("Invalid response");
  }

  @Test
  public void should_return_no_files_for_tsconfig_no_response() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("badResponse.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());
    assertThat(eslintBridgeServer.tsConfigFiles("path/to/tsconfig.json").files).isEmpty();
    TsConfigFile tsConfigFile = eslintBridgeServer.loadTsConfig("path/to/tsconfig.json");
    assertThat(tsConfigFile.files).isEmpty();
  }

  @Test
  public void should_return_no_files_for_tsconfig_on_error() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("tsConfigError.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    TsConfigFile tsConfigFile = eslintBridgeServer.loadTsConfig("path/to/tsconfig.json");
    assertThat(tsConfigFile.files).isEmpty();
    assertThat(logTester.logs(ERROR)).contains("Other error");
  }

  @Test
  public void log_error_when_timeout() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("timeout.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    assertThatThrownBy(() -> eslintBridgeServer.loadTsConfig("any.ts"))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("eslint-bridge is unresponsive");
    assertThat(logTester.logs(ERROR)).contains("eslint-bridge Node.js process is unresponsive. This is most likely " +
      "caused by process running out of memory. Consider setting sonar.javascript.node.maxspace to higher value" +
      " (e.g. 4096).");
  }

  @Test
  public void test_rule_tostring() {
    EslintBridgeServer.Rule rule = new EslintBridgeServer.Rule("key", emptyList());
    assertThat(rule).hasToString("key");
  }

  @Test
  public void should_load_custom_rules() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, Arrays.asList(Paths.get("bundle1"), Paths.get("bundle2")));
    eslintBridgeServer.stop();

    assertThat(logTester.logs()).contains("additional rules: [bundle1" + File.pathSeparator + "bundle2]");
  }

  @Test
  public void should_use_default_timeout() {
    eslintBridgeServer = new EslintBridgeServerImpl(NodeCommand.builder(), mock(Bundle.class), mock(RulesBundles.class), deprecationWarning);
    assertThat(eslintBridgeServer.getTimeoutSeconds()).isEqualTo(60);
  }

  @Test
  public void waitServerToStart_can_be_interrupted() throws InterruptedException {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    // try to connect to a port that does not exists
    Thread worker = new Thread(() -> eslintBridgeServer.waitServerToStart(1000));
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

  private EslintBridgeServerImpl createEslintBridgeServer(String startServerScript) {
    return new EslintBridgeServerImpl(NodeCommand.builder(), TEST_TIMEOUT_SECONDS, new TestBundle(startServerScript), emptyRulesBundles, deprecationWarning);
  }

  static class TestBundle implements Bundle {

    final String startServerScript;

    TestBundle(String startServerScript) {
      this.startServerScript = startServerScript;
    }

    @Override
    public void deploy() {
      // no-op for unit test
    }

    @Override
    public String startServerScript() {
      return "src/test/resources/mock-eslint-bridge/" + startServerScript;
    }

    @Override
    public String resolve(String relativePath) {
      File file = new File("src/test/resources");
      return new File(file.getAbsoluteFile(), relativePath).getAbsolutePath();
    }
  }
}
