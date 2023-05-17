/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.sonar.api.utils.log.LoggerLevel.DEBUG;
import static org.sonar.api.utils.log.LoggerLevel.ERROR;
import static org.sonar.api.utils.log.LoggerLevel.INFO;
import static org.sonar.api.utils.log.LoggerLevel.WARN;
import static org.sonar.plugins.javascript.eslint.AnalysisMode.DEFAULT_LINTER_ID;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.awaitility.Awaitility;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.Sensor;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.internal.SonarRuntimeImpl;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.api.utils.log.LogTesterJUnit5;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.CssAnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.nodejs.NodeCommand;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilder;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;

class EslintBridgeServerImplTest {

  private static final String START_SERVER_SCRIPT = "startServer.js";
  private static final int TEST_TIMEOUT_SECONDS = 1;
  private final Monitoring monitoring = new Monitoring(new MapSettings().asConfig());

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5();

  @TempDir
  Path moduleBase;

  @TempDir
  Path workDir;

  @TempDir
  File tempDir;

  TempFolder tempFolder;

  private SensorContextTester context;
  private EslintBridgeServerImpl eslintBridgeServer;
  private final TestBundle testBundle = new TestBundle(START_SERVER_SCRIPT);

  private final RulesBundles emptyRulesBundles = new RulesBundles();
  private final NodeDeprecationWarning deprecationWarning = new NodeDeprecationWarning(
    new AnalysisWarningsWrapper()
  );

  @BeforeEach
  public void setUp() throws Exception {
    context = SensorContextTester.create(moduleBase);
    context.fileSystem().setWorkDir(workDir);
    tempFolder = new DefaultTempFolder(tempDir, true);
  }

  @AfterEach
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
  void should_throw_when_not_existing_script() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("NOT_EXISTING.js");
    eslintBridgeServer.deploy();
    List<Path> deployedBundles = emptyList();

    assertThatThrownBy(() -> eslintBridgeServer.startServer(context, deployedBundles))
      .isInstanceOf(NodeCommandException.class)
      .hasMessageStartingWith("Node.js script to start eslint-bridge server doesn't exist:");
  }

  @Test
  void should_throw_if_failed_to_build_node_command() throws Exception {
    NodeCommandBuilder nodeCommandBuilder = mock(
      NodeCommandBuilder.class,
      invocation -> {
        if (NodeCommandBuilder.class.equals(invocation.getMethod().getReturnType())) {
          return invocation.getMock();
        } else {
          throw new NodeCommandException("msg");
        }
      }
    );

    eslintBridgeServer =
      new EslintBridgeServerImpl(
        nodeCommandBuilder,
        TEST_TIMEOUT_SECONDS,
        testBundle,
        emptyRulesBundles,
        deprecationWarning,
        tempFolder,
        monitoring
      );
    eslintBridgeServer.deploy();
    List<Path> deployedBundles = emptyList();

    assertThatThrownBy(() -> eslintBridgeServer.startServer(context, deployedBundles))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("msg");
  }

  @Test
  void should_forward_process_streams() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("logging.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    assertThat(logTester.logs(DEBUG)).contains("testing debug log");
    assertThat(logTester.logs(WARN)).contains("testing warn log");
    assertThat(logTester.logs(INFO)).contains("testing info log");
    assertThat(logTester.logs(INFO)).contains("BROWSERSLIST_IGNORE_OLD_DATA is set to true");
  }

  @Test
  void should_get_answer_from_server() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    DefaultInputFile inputFile = TestInputFileBuilder
      .create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    JsAnalysisRequest request = createRequest(inputFile);
    assertThat(eslintBridgeServer.analyzeJavaScript(request).issues).isEmpty();
  }

  @Test
  void test_init() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    List<EslintRule> rules = Collections.singletonList(
      new EslintRule(
        "key",
        singletonList("config"),
        Collections.singletonList(InputFile.Type.MAIN),
        JavaScriptLanguage.KEY
      )
    );
    eslintBridgeServer.initLinter(
      rules,
      Collections.emptyList(),
      Collections.emptyList(),
      AnalysisMode.DEFAULT
    );
    eslintBridgeServer.stop();
    assertThat(logTester.logs())
      .contains(
        "{\"linterId\":\"default\",\"rules\":[{\"key\":\"key\",\"fileTypeTarget\":[\"MAIN\"],\"configurations\":[\"config\"],\"language\":\"js\"}],\"environments\":[],\"globals\":[]}"
      );
  }

  @Test
  void should_get_answer_from_server_for_ts_request() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    DefaultInputFile inputFile = TestInputFileBuilder
      .create("foo", "foo.ts")
      .setContents("alert('Fly, you fools!')")
      .build();
    DefaultInputFile tsConfig = TestInputFileBuilder
      .create("foo", "tsconfig.json")
      .setContents("{\"compilerOptions\": {\"target\": \"es6\", \"allowJs\": true }}")
      .build();
    JsAnalysisRequest request = new JsAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      JavaScriptLanguage.KEY,
      null,
      true,
      singletonList(tsConfig.absolutePath()),
      DEFAULT_LINTER_ID,
      false,
      context.fileSystem().baseDir().getAbsolutePath()
    );
    assertThat(eslintBridgeServer.analyzeTypeScript(request).issues).isEmpty();
  }

  @Test
  void should_get_answer_from_server_for_yaml_request() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    DefaultInputFile inputFile = TestInputFileBuilder
      .create("foo", "foo.yaml")
      .setContents("alert('Fly, you fools!')")
      .build();
    var request = createRequest(inputFile);
    assertThat(eslintBridgeServer.analyzeYaml(request).issues).isEmpty();
  }

  @NotNull
  private static JsAnalysisRequest createRequest(DefaultInputFile inputFile) {
    return new JsAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      JavaScriptLanguage.KEY,
      null,
      true,
      null,
      DEFAULT_LINTER_ID,
      false,
      "baseDir"
    );
  }

  @Test
  void should_get_answer_from_server_for_css_request() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    DefaultInputFile inputFile = TestInputFileBuilder
      .create("foo", "foo.css")
      .setContents("a { }")
      .build();
    CssAnalysisRequest request = new CssAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      Collections.emptyList()
    );
    assertThat(eslintBridgeServer.analyzeCss(request).issues).isEmpty();
  }

  @Test
  void should_throw_if_failed_to_start() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("throw.js");
    eslintBridgeServer.deploy();
    List<Path> deployedBundles = emptyList();

    assertThatThrownBy(() -> eslintBridgeServer.startServer(context, deployedBundles))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)");
  }

  @Test
  void should_return_command_info() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo())
      .isEqualTo("Node.js command to start eslint-bridge server was not built yet.");

    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    assertThat(eslintBridgeServer.getCommandInfo())
      .contains("Node.js command to start eslint-bridge was: ", "node", START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo()).doesNotContain("--max-old-space-size");
  }

  @Test
  void should_set_max_old_space_size() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.getCommandInfo())
      .isEqualTo("Node.js command to start eslint-bridge server was not built yet.");

    eslintBridgeServer.deploy();
    context.setSettings(new MapSettings().setProperty("sonar.javascript.node.maxspace", 2048));
    eslintBridgeServer.startServer(context, emptyList());

    assertThat(eslintBridgeServer.getCommandInfo()).contains("--max-old-space-size=2048");
  }

  @Test
  void should_set_allowTsParserJsFiles_to_false() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    context.setSettings(
      new MapSettings().setProperty("sonar.javascript.allowTsParserJsFiles", "false")
    );
    eslintBridgeServer.startServer(context, emptyList());
    eslintBridgeServer.stop();

    assertThat(logTester.logs()).contains("allowTsParserJsFiles: false");
  }

  @Test
  void allowTsParserJsFiles_default_value_is_true() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());
    eslintBridgeServer.stop();

    assertThat(logTester.logs()).contains("allowTsParserJsFiles: true");
  }

  @Test
  void test_isAlive() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    assertThat(eslintBridgeServer.isAlive()).isFalse();
    eslintBridgeServer.startServerLazily(context);
    assertThat(eslintBridgeServer.isAlive()).isTrue();
    eslintBridgeServer.clean();
    assertThat(eslintBridgeServer.isAlive()).isFalse();
  }

  @Test
  void test_lazy_start() throws Exception {
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
  void should_throw_special_exception_when_failed_start_server_before() {
    eslintBridgeServer = createEslintBridgeServer("throw.js");
    String failedToStartExceptionMessage =
      "Failed to start server (" + TEST_TIMEOUT_SECONDS + "s timeout)";
    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage(failedToStartExceptionMessage);

    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(ServerAlreadyFailedException.class);
  }

  @Test
  void should_throw_special_exception_when_failed_start_process_before() {
    eslintBridgeServer = createEslintBridgeServer("invalid");
    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(NodeCommandException.class)
      .hasMessageStartingWith("Node.js script to start eslint-bridge server doesn't exist");

    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(ServerAlreadyFailedException.class);
  }

  @Test
  void should_throw_if_server_not_alive() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("startAndClose.js");
    eslintBridgeServer.startServerLazily(context);

    eslintBridgeServer.waitFor();

    assertThatThrownBy(() -> eslintBridgeServer.startServerLazily(context))
      .isInstanceOf(ServerAlreadyFailedException.class);
  }

  @Test
  void should_fail_if_bad_json_response() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("badResponse.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServerLazily(context);

    DefaultInputFile inputFile = TestInputFileBuilder
      .create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    JsAnalysisRequest request = new JsAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      JavaScriptLanguage.KEY,
      null,
      true,
      null,
      DEFAULT_LINTER_ID,
      false,
      "baseDir"
    );
    assertThatThrownBy(() -> eslintBridgeServer.analyzeJavaScript(request))
      .isInstanceOf(IllegalStateException.class);
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  void should_not_search_typescript_when_no_ts_file() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    SensorContextTester ctx = SensorContextTester.create(moduleBase);
    ctx.fileSystem().setWorkDir(workDir);
    Path tsDir = moduleBase.resolve("dir/node_modules/typescript");
    Files.createDirectories(tsDir);
    eslintBridgeServer.startServer(ctx, emptyList());
    assertThat(eslintBridgeServer.getCommandInfo()).doesNotContain("NODE_PATH");
  }

  @Test
  void log_error_when_timeout() throws Exception {
    eslintBridgeServer = createEslintBridgeServer("timeout.js");
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(context, emptyList());

    assertThatThrownBy(() ->
        eslintBridgeServer.initLinter(
          Collections.emptyList(),
          Collections.emptyList(),
          Collections.emptyList(),
          AnalysisMode.DEFAULT
        )
      )
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("eslint-bridge is unresponsive");
    assertThat(logTester.logs(ERROR))
      .contains(
        "eslint-bridge Node.js process is unresponsive. This is most likely " +
        "caused by process running out of memory. Consider setting sonar.javascript.node.maxspace to higher value" +
        " (e.g. 4096)."
      );
  }

  @Test
  void test_rule_tostring() {
    EslintRule rule = new EslintRule(
      "key",
      emptyList(),
      Collections.singletonList(InputFile.Type.MAIN),
      JavaScriptLanguage.KEY
    );
    assertThat(rule).hasToString("key");
  }

  @Test
  void should_load_custom_rules() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServer(
      context,
      Arrays.asList(Paths.get("bundle1"), Paths.get("bundle2"))
    );
    eslintBridgeServer.stop();

    assertThat(logTester.logs())
      .contains("additional rules: [bundle1" + File.pathSeparator + "bundle2]");
  }

  @Test
  void should_skip_metrics_on_sonarlint() throws Exception {
    eslintBridgeServer = createEslintBridgeServer(START_SERVER_SCRIPT);
    eslintBridgeServer.deploy();
    context.setRuntime(SonarRuntimeImpl.forSonarLint(Version.create(7, 9)));
    eslintBridgeServer.startServer(
      context,
      Arrays.asList(Paths.get("bundle1"), Paths.get("bundle2"))
    );
    eslintBridgeServer.stop();

    assertThat(logTester.logs()).contains("sonarlint: true");
  }

  @Test
  void should_use_default_timeout() {
    eslintBridgeServer =
      new EslintBridgeServerImpl(
        NodeCommand.builder(),
        mock(Bundle.class),
        mock(RulesBundles.class),
        deprecationWarning,
        tempFolder,
        monitoring
      );
    assertThat(eslintBridgeServer.getTimeoutSeconds()).isEqualTo(300);
  }

  @Test
  void waitServerToStart_can_be_interrupted() throws InterruptedException {
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

  @Test
  void enabled_monitoring() throws Exception {
    var settings = new MapSettings();
    settings.setProperty("sonar.javascript.monitoring", "true");
    var monitoring = new Monitoring(settings.asConfig());
    monitoring.startSensor(
      context,
      new Sensor() {
        @Override
        public void describe(SensorDescriptor descriptor) {}

        @Override
        public void execute(SensorContext context) {}
      }
    );
    assertThat(monitoring.isMonitoringEnabled()).isTrue();
    eslintBridgeServer =
      new EslintBridgeServerImpl(
        NodeCommand.builder(),
        TEST_TIMEOUT_SECONDS,
        new TestBundle(START_SERVER_SCRIPT),
        emptyRulesBundles,
        deprecationWarning,
        tempFolder,
        monitoring
      );
    eslintBridgeServer.deploy();
    eslintBridgeServer.startServerLazily(context);
    eslintBridgeServer.stop();
    var rules = monitoring
      .metrics()
      .stream()
      .filter(m -> m.metricType == Monitoring.MetricType.RULE)
      .map(m -> ((Monitoring.RuleMetric) m).ruleKey)
      .collect(Collectors.toList());
    assertThat(rules).containsExactly("no-commented-code", "arguments-order", "deprecation");
  }

  @Test
  void test_ucfg_bundle_version() throws Exception {
    RulesBundlesTest.TestUcfgRulesBundle ucfgRulesBundle = new RulesBundlesTest.TestUcfgRulesBundle(
      "/test-bundle.tgz"
    );

    RulesBundles rulesBundles = mock(RulesBundles.class);
    when(rulesBundles.getUcfgRulesBundle()).thenReturn(Optional.of(ucfgRulesBundle));

    eslintBridgeServer =
      new EslintBridgeServerImpl(
        NodeCommand.builder(),
        TEST_TIMEOUT_SECONDS,
        new TestBundle(START_SERVER_SCRIPT),
        rulesBundles,
        deprecationWarning,
        tempFolder,
        monitoring
      );
    eslintBridgeServer.startServerLazily(context);

    assertThat(logTester.logs(DEBUG))
      .contains("Security Frontend version is available: [some_bundle_version]");
  }

  private EslintBridgeServerImpl createEslintBridgeServer(String startServerScript) {
    return new EslintBridgeServerImpl(
      NodeCommand.builder(),
      TEST_TIMEOUT_SECONDS,
      new TestBundle(startServerScript),
      emptyRulesBundles,
      deprecationWarning,
      tempFolder,
      monitoring
    );
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
      return "src/test/resources/mock-eslint-bridge/" + startServerScript;
    }

    @Override
    public String resolve(String relativePath) {
      File file = new File("src/test/resources");
      return new File(file.getAbsoluteFile(), relativePath).getAbsolutePath();
    }
  }
}
