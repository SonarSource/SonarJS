/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import static java.util.Collections.emptyList;
import static java.util.Collections.singletonList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;
import static org.slf4j.event.Level.DEBUG;
import static org.slf4j.event.Level.ERROR;
import static org.slf4j.event.Level.INFO;
import static org.slf4j.event.Level.WARN;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_FORCE_HOST_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.SKIP_NODE_PROVISIONING_PROPERTY;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import javax.annotation.Nonnull;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.internal.DefaultInputFile;
import org.sonar.api.batch.fs.internal.TestInputFileBuilder;
import org.sonar.api.batch.sensor.internal.SensorContextTester;
import org.sonar.api.config.internal.MapSettings;
import org.sonar.api.impl.utils.DefaultTempFolder;
import org.sonar.api.testfixtures.log.LogTesterJUnit5;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.Version;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.bridge.BridgeServer.CssAnalysisRequest;
import org.sonar.plugins.javascript.bridge.BridgeServer.Dependency;
import org.sonar.plugins.javascript.bridge.BridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.bridge.BridgeServer.TsProgram;
import org.sonar.plugins.javascript.bridge.BridgeServer.TsProgramRequest;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilder;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

class BridgeServerImplTest {

  private static final String START_SERVER_SCRIPT = "startServer.js";
  private static final int TEST_TIMEOUT_SECONDS = 1;

  @RegisterExtension
  public LogTesterJUnit5 logTester = new LogTesterJUnit5().setLevel(DEBUG);

  @TempDir
  Path moduleBase;

  @TempDir
  Path workDir;

  @TempDir
  File tempDir;

  TempFolder tempFolder;

  private SensorContextTester context;
  private BridgeServerConfig serverConfig;
  private BridgeServerImpl bridgeServer;
  private final TestBundle testBundle = new TestBundle(START_SERVER_SCRIPT);

  private final RulesBundles emptyRulesBundles = new RulesBundles();
  private final NodeDeprecationWarning deprecationWarning = new NodeDeprecationWarning(
    new AnalysisWarningsWrapper()
  );
  private EmbeddedNode unsupportedEmbeddedRuntime;

  @BeforeEach
  public void setUp() {
    context = SensorContextTester.create(moduleBase);
    context.fileSystem().setWorkDir(workDir);
    serverConfig = BridgeServerConfig.fromSensorContext(context);
    tempFolder = new DefaultTempFolder(tempDir, true);
    unsupportedEmbeddedRuntime = new EmbeddedNode(
      mock(ProcessWrapper.class),
      createUnsupportedEnvironment()
    );
  }

  @AfterEach
  public void tearDown() {
    try {
      if (bridgeServer != null) {
        bridgeServer.clean();
      }
    } catch (Exception e) {
      // ignore
      e.printStackTrace();
    }
  }

  @Test
  void should_throw_when_not_existing_script() {
    bridgeServer = createBridgeServer("NOT_EXISTING.js");

    assertThatThrownBy(() -> bridgeServer.startServer(serverConfig))
      .isInstanceOf(NodeCommandException.class)
      .hasMessageStartingWith("Node.js script to start the bridge server doesn't exist:");
  }

  @Test
  void should_throw_if_failed_to_build_node_command() {
    NodeCommandBuilder nodeCommandBuilder = mock(NodeCommandBuilder.class, invocation -> {
      if (NodeCommandBuilder.class.equals(invocation.getMethod().getReturnType())) {
        return invocation.getMock();
      } else {
        throw new NodeCommandException("msg");
      }
    });

    bridgeServer = new BridgeServerImpl(
      nodeCommandBuilder,
      TEST_TIMEOUT_SECONDS,
      testBundle,
      emptyRulesBundles,
      deprecationWarning,
      tempFolder,
      unsupportedEmbeddedRuntime
    );

    assertThatThrownBy(() -> bridgeServer.startServer(serverConfig))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("msg");
  }

  @Test
  void should_forward_process_streams() throws Exception {
    bridgeServer = createBridgeServer("logging.js");
    bridgeServer.startServer(serverConfig);

    assertThat(logTester.logs(DEBUG)).contains("testing debug log");
    assertThat(logTester.logs(WARN)).contains("testing warn log");
    assertThat(logTester.logs(INFO)).contains("testing info log");
    assertThat(logTester.logs(INFO)).contains("BROWSERSLIST_IGNORE_OLD_DATA is set to true");
  }

  @Test
  void should_get_answer_from_server() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    JsAnalysisRequest request = createRequest(inputFile);
    var response = bridgeServer.analyzeJsTs(request);
    assertThat(response.issues()).hasSize(1);
  }

  @Test
  void test_init() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    List<EslintRule> rules = Collections.singletonList(
      new EslintRule(
        "key",
        singletonList("config"),
        Collections.singletonList(InputFile.Type.MAIN),
        singletonList(AnalysisMode.DEFAULT),
        "js"
      )
    );
    bridgeServer.initLinter(rules, Collections.emptyList(), Collections.emptyList(), "");
    bridgeServer.stop();
    assertThat(logTester.logs()).contains(
      "{\"rules\":[{\"key\":\"key\",\"fileTypeTargets\":[\"MAIN\"],\"configurations\":[\"config\"],\"analysisModes\":[\"DEFAULT\"],\"language\":\"js\"}],\"environments\":[],\"globals\":[],\"baseDir\":\"\",\"sonarlint\":false,\"bundles\":[]}"
    );
  }

  @Test
  void should_get_answer_from_server_for_ts_request() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.ts")
      .setContents("alert('Fly, you fools!')")
      .build();
    DefaultInputFile tsConfig = TestInputFileBuilder.create("foo", "tsconfig.json")
      .setContents("{\"compilerOptions\": {\"target\": \"es6\", \"allowJs\": true }}")
      .build();
    JsAnalysisRequest request = new JsAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      null,
      true,
      singletonList(tsConfig.absolutePath()),
      null,
      inputFile.status(),
      AnalysisMode.DEFAULT,
      false,
      false,
      false,
      true
    );
    assertThat(bridgeServer.analyzeJsTs(request).issues()).hasSize(1);
  }

  @Test
  void should_get_answer_from_server_for_yaml_request() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.yaml")
      .setContents("alert('Fly, you fools!')")
      .build();
    var request = createRequest(inputFile);
    assertThat(bridgeServer.analyzeYaml(request).issues()).hasSize(1);
  }

  @Nonnull
  private static JsAnalysisRequest createRequest(DefaultInputFile inputFile) {
    return new JsAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      null,
      true,
      null,
      null,
      inputFile.status(),
      AnalysisMode.DEFAULT,
      false,
      false,
      false,
      true
    );
  }

  @Test
  void should_get_answer_from_server_for_program_based_requests() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    TsProgram programCreated = bridgeServer.createProgram(
      new TsProgramRequest("/absolute/path/tsconfig.json")
    );

    // values from 'startServer.js'
    assertThat(programCreated.programId()).isEqualTo("42");
    assertThat(programCreated.projectReferences()).isEmpty();
    assertThat(programCreated.files()).hasSize(3);

    JsAnalysisRequest request = new JsAnalysisRequest(
      "/absolute/path/file.ts",
      "MAIN",
      null,
      true,
      null,
      programCreated.programId(),
      InputFile.Status.ADDED,
      AnalysisMode.DEFAULT,
      false,
      false,
      false,
      true
    );
    assertThat(bridgeServer.analyzeJsTs(request).issues()).hasSize(1);

    assertThat(bridgeServer.deleteProgram(programCreated)).isTrue();
  }

  @Test
  void should_create_tsconfig_files() throws IOException {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    var tsConfig = bridgeServer.createTsConfigFile("{\"include\":[\"/path/to/project/**/*\"]}");
    assertThat(tsConfig.getFilename()).isEqualTo("/path/to/tsconfig.json");
  }

  @Test
  void should_not_fail_when_error_during_create_program() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    TsProgram programCreated = bridgeServer.createProgram(
      new TsProgramRequest("/absolute/path/invalid.json")
    );

    assertThat(programCreated.programId()).isNull();
    assertThat(programCreated.error()).isEqualTo("failed to create program");
  }

  @Test
  void should_get_answer_from_server_for_css_request() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.css")
      .setContents("a { }")
      .build();
    CssAnalysisRequest request = new CssAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      Collections.emptyList()
    );
    assertThat(bridgeServer.analyzeCss(request).issues()).hasSize(1);
  }

  @Test
  void should_throw_if_failed_to_start() {
    bridgeServer = createBridgeServer("throw.js");

    assertThatThrownBy(() -> bridgeServer.startServer(serverConfig))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage("Failed to start the bridge server (" + TEST_TIMEOUT_SECONDS + "s timeout)");
  }

  @Test
  void should_return_command_info() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    assertThat(bridgeServer.getCommandInfo()).isEqualTo(
      "Node.js command to start the bridge server was not built yet."
    );

    bridgeServer.startServer(serverConfig);

    assertThat(bridgeServer.getCommandInfo()).contains(
      "Node.js command to start the bridge server was: ",
      "node",
      START_SERVER_SCRIPT
    );
    assertThat(bridgeServer.getCommandInfo()).doesNotContain("--max-old-space-size");
  }

  @Test
  void should_set_max_old_space_size() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    assertThat(bridgeServer.getCommandInfo()).isEqualTo(
      "Node.js command to start the bridge server was not built yet."
    );

    context.setSettings(new MapSettings().setProperty("sonar.javascript.node.maxspace", 2048));
    BridgeServerConfig serverConfigForMaxSpace = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServer(serverConfigForMaxSpace);

    assertThat(bridgeServer.getCommandInfo()).contains("--max-old-space-size=2048");
  }

  @Test
  void test_isAlive() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    assertThat(bridgeServer.isAlive()).isFalse();
    bridgeServer.startServerLazily(serverConfig);
    assertThat(bridgeServer.isAlive()).isTrue();
    bridgeServer.clean();
    assertThat(bridgeServer.isAlive()).isFalse();
  }

  @Test
  void test_lazy_start() throws Exception {
    String alreadyStarted = "The bridge server is up, no need to start.";
    String starting = "Creating Node.js process to start the bridge server on port";
    bridgeServer = createBridgeServer("startServer.js");
    bridgeServer.startServerLazily(serverConfig);
    assertThat(logTester.logs(DEBUG).stream().anyMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    logTester.clear();
    bridgeServer.startServerLazily(serverConfig);
    assertThat(logTester.logs(DEBUG).stream().noneMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).contains(alreadyStarted);
  }

  @Test
  void test_use_existing_node() throws Exception {
    String starting = "Creating Node.js process to start the bridge server on port";
    var useExisting = "Using existing Node.js process on port 60000";
    var alreadyStarted = "The bridge server is up, no need to start.";
    var wrongPortRange =
      "Node.js process port set in $SONARJS_EXISTING_NODE_PROCESS_PORT should be a number between 1 and 65535 range";
    var wrongPortValue =
      "Error parsing number in environment variable SONARJS_EXISTING_NODE_PROCESS_PORT";

    bridgeServer = createBridgeServer("startServer.js");
    var bridgeServerMock = spy(bridgeServer);
    doReturn("70000").when(bridgeServerMock).getExistingNodeProcessPort();
    assertThatThrownBy(() -> bridgeServerMock.startServerLazily(serverConfig))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage(wrongPortRange);
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    assertThat(logTester.logs(DEBUG).stream().noneMatch(s -> s.startsWith(starting))).isTrue();

    doReturn("a").when(bridgeServerMock).getExistingNodeProcessPort();
    assertThatThrownBy(() -> bridgeServerMock.startServerLazily(serverConfig))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage(wrongPortValue);
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    assertThat(logTester.logs(DEBUG).stream().noneMatch(s -> s.startsWith(starting))).isTrue();

    //Port 0 will be considered as not set, and a new node process will be started on a random port
    doReturn("0").when(bridgeServerMock).getExistingNodeProcessPort();
    bridgeServerMock.startServerLazily(serverConfig);
    assertThat(logTester.logs(DEBUG).stream().anyMatch(s -> s.startsWith(starting))).isTrue();
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    bridgeServerMock.clean();

    doReturn("60000").when(bridgeServerMock).getExistingNodeProcessPort();
    doReturn(true).when(bridgeServerMock).isAlive();
    bridgeServerMock.startServerLazily(serverConfig);
    assertThat(logTester.logs(INFO)).contains(useExisting);
    assertThat(logTester.logs(DEBUG)).contains(alreadyStarted);
  }

  @Test
  void should_throw_special_exception_when_failed_start_server_before() {
    bridgeServer = createBridgeServer("throw.js");
    String failedToStartExceptionMessage =
      "Failed to start the bridge server (" + TEST_TIMEOUT_SECONDS + "s timeout)";
    assertThatThrownBy(() -> bridgeServer.startServerLazily(serverConfig))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage(failedToStartExceptionMessage);

    assertThatThrownBy(() -> bridgeServer.startServerLazily(serverConfig)).isInstanceOf(
      ServerAlreadyFailedException.class
    );
  }

  @Test
  void should_throw_special_exception_when_failed_start_process_before() {
    bridgeServer = createBridgeServer("invalid");
    assertThatThrownBy(() -> bridgeServer.startServerLazily(serverConfig))
      .isInstanceOf(NodeCommandException.class)
      .hasMessageStartingWith("Node.js script to start the bridge server doesn't exist");

    assertThatThrownBy(() -> bridgeServer.startServerLazily(serverConfig)).isInstanceOf(
      ServerAlreadyFailedException.class
    );
  }

  @Test
  void should_throw_if_server_not_alive() throws Exception {
    bridgeServer = createBridgeServer("startAndClose.js");
    bridgeServer.startServerLazily(serverConfig);

    bridgeServer.waitFor();

    assertThatThrownBy(() -> bridgeServer.startServerLazily(serverConfig)).isInstanceOf(
      ServerAlreadyFailedException.class
    );
  }

  @Test
  void should_fail_if_bad_json_response() throws Exception {
    bridgeServer = createBridgeServer("badResponse.js");
    bridgeServer.startServerLazily(serverConfig);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    JsAnalysisRequest request = new JsAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      null,
      true,
      null,
      null,
      inputFile.status(),
      AnalysisMode.DEFAULT,
      false,
      false,
      false,
      true
    );
    assertThatThrownBy(() -> bridgeServer.analyzeJsTs(request)).isInstanceOf(
      IllegalStateException.class
    );
    assertThat(context.allIssues()).isEmpty();
  }

  @Test
  void should_not_search_typescript_when_no_ts_file() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    SensorContextTester ctx = SensorContextTester.create(moduleBase);
    ctx.fileSystem().setWorkDir(workDir);
    Path tsDir = moduleBase.resolve("dir/node_modules/typescript");
    Files.createDirectories(tsDir);
    bridgeServer.startServer(BridgeServerConfig.fromSensorContext(ctx));
    assertThat(bridgeServer.getCommandInfo()).doesNotContain("NODE_PATH");
  }

  @Test
  void should_reload_tsconfig() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);
    assertThat(bridgeServer.newTsConfig()).isTrue();
  }

  @Test
  void should_return_files_for_tsconfig() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);
    String tsconfig = "path/to/tsconfig.json";
    BridgeServerImpl.TsConfigResponse tsConfigResponse = bridgeServer.tsConfigFiles(tsconfig);
    assertThat(tsConfigResponse.files).contains(
      "abs/path/file1",
      "abs/path/file2",
      "abs/path/file3"
    );
    assertThat(tsConfigResponse.error).isNull();

    TsConfigFile tsConfigFile = bridgeServer.loadTsConfig(tsconfig);
    assertThat(tsConfigFile.getFiles()).contains(
      "abs/path/file1",
      "abs/path/file2",
      "abs/path/file3"
    );
    assertThat(tsConfigFile.getFilename()).isEqualTo(tsconfig);
  }

  @Test
  void should_return_no_files_for_tsconfig_bad_response() throws Exception {
    bridgeServer = createBridgeServer("badResponse.js");
    bridgeServer.startServer(serverConfig);
    BridgeServerImpl.TsConfigResponse response = bridgeServer.tsConfigFiles(
      "path/to/tsconfig.json"
    );
    assertThat(response.files).isEmpty();
    assertThat(response.error).isEqualTo("Invalid response");
  }

  @Test
  void should_return_no_files_for_tsconfig_no_response() throws Exception {
    bridgeServer = createBridgeServer("badResponse.js");
    bridgeServer.startServer(serverConfig);
    assertThat(bridgeServer.tsConfigFiles("path/to/tsconfig.json").files).isEmpty();
    TsConfigFile tsConfigFile = bridgeServer.loadTsConfig("path/to/tsconfig.json");
    assertThat(tsConfigFile.getFiles()).isEmpty();
  }

  @Test
  void should_return_no_files_for_tsconfig_on_error() throws Exception {
    bridgeServer = createBridgeServer("tsConfigError.js");
    bridgeServer.startServer(serverConfig);

    TsConfigFile tsConfigFile = bridgeServer.loadTsConfig("path/to/tsconfig.json");
    assertThat(tsConfigFile.getFiles()).isEmpty();
    assertThat(logTester.logs(ERROR)).contains("Other error");
  }

  @Test
  void log_error_when_timeout() throws Exception {
    bridgeServer = createBridgeServer("timeout.js");
    bridgeServer.startServer(serverConfig);

    assertThatThrownBy(() -> bridgeServer.loadTsConfig("any.ts"))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage("The bridge server is unresponsive");
  }

  @Test
  void test_rule_tostring() {
    EslintRule rule = new EslintRule(
      "key",
      emptyList(),
      Collections.singletonList(InputFile.Type.MAIN),
      singletonList(AnalysisMode.DEFAULT),
      "js"
    );
    assertThat(rule).hasToString("key");
  }

  @Test
  void should_pass_debug_memory_option() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    context.setSettings(new MapSettings().setProperty("sonar.javascript.node.debugMemory", "true"));
    BridgeServerConfig serverConfigForDebugMemory = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServer(serverConfigForDebugMemory);
    bridgeServer.stop();

    assertThat(logTester.logs()).contains("debugMemory: true");
  }

  @Test
  void should_use_default_timeout() {
    bridgeServer = new BridgeServerImpl(
      builder(),
      mock(Bundle.class),
      mock(RulesBundles.class),
      deprecationWarning,
      tempFolder,
      unsupportedEmbeddedRuntime
    );
    assertThat(bridgeServer.getTimeoutSeconds()).isEqualTo(300);
  }

  @Test
  void waitServerToStart_can_be_interrupted() throws InterruptedException {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    // try to connect to a port that does not exists
    Thread worker = new Thread(() -> bridgeServer.waitServerToStart(1000));
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
  void test_tsProgram_toString() {
    TsProgram tsProgram = new TsProgram(
      "42",
      singletonList("path/file.ts"),
      singletonList("path/tsconfig.json")
    );
    assertThat(tsProgram).hasToString(
      "TsProgram{programId='42', files=[path/file.ts], projectReferences=[path/tsconfig.json]}"
    );

    TsProgram tsProgramError = new TsProgram("failed to create program");
    assertThat(tsProgramError).hasToString("TsProgram{ error='failed to create program'}");
  }

  @Test
  void enabled_monitoring() throws Exception {
    bridgeServer = new BridgeServerImpl(
      builder(),
      TEST_TIMEOUT_SECONDS,
      new TestBundle(START_SERVER_SCRIPT),
      emptyRulesBundles,
      deprecationWarning,
      tempFolder,
      unsupportedEmbeddedRuntime
    );
    bridgeServer.startServerLazily(serverConfig);
    bridgeServer.stop();
    assertThat(
      logTester.logs(INFO).stream().anyMatch(s -> s.startsWith("no-commented-code"))
    ).isTrue();
    assertThat(
      logTester.logs(INFO).stream().anyMatch(s -> s.startsWith("arguments-order"))
    ).isTrue();
    assertThat(logTester.logs(INFO).stream().anyMatch(s -> s.startsWith("deprecation"))).isTrue();
  }

  @Test
  void test_ucfg_bundle_version() throws Exception {
    RulesBundlesTest.TestUcfgRulesBundle ucfgRulesBundle = new RulesBundlesTest.TestUcfgRulesBundle(
      "/test-bundle.tgz"
    );

    RulesBundles rulesBundles = mock(RulesBundles.class);
    when(rulesBundles.getUcfgRulesBundle()).thenReturn(Optional.of(ucfgRulesBundle));

    bridgeServer = new BridgeServerImpl(
      builder(),
      TEST_TIMEOUT_SECONDS,
      new TestBundle(START_SERVER_SCRIPT),
      rulesBundles,
      deprecationWarning,
      tempFolder,
      unsupportedEmbeddedRuntime
    );
    bridgeServer.startServerLazily(serverConfig);

    assertThat(logTester.logs(DEBUG)).contains(
      "Security Frontend version is available: [some_bundle_version]"
    );
  }

  @Test
  void should_return_telemetry() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);
    var telemetry = bridgeServer.getTelemetry();
    assertThat(telemetry.dependencies()).isEqualTo(List.of(new Dependency("pkg1", "1.0.0")));
    var runtimeTelemetry = telemetry.runtimeTelemetry();
    assertThat(runtimeTelemetry.version().isGreaterThanOrEqual(Version.create(22, 9))).isTrue();
    assertThat(runtimeTelemetry.nodeExecutableOrigin()).isNotEmpty();
  }

  @Test
  void should_return_an_ast() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    JsAnalysisRequest request = createRequest(inputFile);
    var response = bridgeServer.analyzeJsTs(request);
    assertThat(response.ast()).isNotNull();
    Node node = response.ast();
    assertThat(node.getProgram()).isNotNull();
    assertThat(node.getProgram().getBodyList().get(0).getExpressionStatement()).isNotNull();
  }

  @Test
  void should_omit_an_ast_if_skipAst_flag_is_set() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(BridgeServerConfig.fromSensorContext(context));

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
    JsAnalysisRequest request = new JsAnalysisRequest(
      inputFile.absolutePath(),
      inputFile.type().toString(),
      null,
      true,
      null,
      null,
      inputFile.status(),
      AnalysisMode.DEFAULT,
      true,
      false,
      false,
      true
    );
    var response = bridgeServer.analyzeJsTs(request);
    assertThat(response.ast()).isNull();
  }

  @Test
  void should_not_deploy_runtime_if_sonar_nodejs_executable_is_set() {
    var existingDoesntMatterScript = "logging.js";
    bridgeServer = createBridgeServer(existingDoesntMatterScript);
    context.setSettings(new MapSettings().setProperty(NODE_EXECUTABLE_PROPERTY, "whatever"));
    BridgeServerConfig serverConfigForExecutableProperty = BridgeServerConfig.fromSensorContext(
      context
    );
    assertThatThrownBy(() -> bridgeServer.startServerLazily(serverConfigForExecutableProperty)
    ).isInstanceOf(NodeCommandException.class);

    assertThat(logTester.logs(INFO)).contains(
      "'" + NODE_EXECUTABLE_PROPERTY + "' is set. Skipping embedded Node.js runtime deployment."
    );
  }

  @Test
  void should_not_deploy_runtime_if_skip_node_provisioning_is_set() throws Exception {
    var script = "logging.js";
    bridgeServer = createBridgeServer(script);

    var settings = new MapSettings().setProperty(SKIP_NODE_PROVISIONING_PROPERTY, true);
    context.setSettings(settings);

    var config = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServerLazily(config);

    assertThat(logTester.logs(INFO)).contains(
      "'" +
      SKIP_NODE_PROVISIONING_PROPERTY +
      "' is set. Skipping embedded Node.js runtime deployment."
    );
  }

  @Test
  void should_not_deploy_runtime_if_node_force_host_is_set() throws Exception {
    var script = "logging.js";
    bridgeServer = createBridgeServer(script);

    var settings = new MapSettings().setProperty(NODE_FORCE_HOST_PROPERTY, true);
    context.setSettings(settings);

    var config = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServerLazily(config);

    assertThat(logTester.logs(INFO)).contains(
      "'" + NODE_FORCE_HOST_PROPERTY + "' is set. Skipping embedded Node.js runtime deployment."
    );
  }

  @Test
  void should_start_bridge_from_path() throws IOException {
    bridgeServer = createBridgeServer(new BundleImpl());
    var deployLocation = "src/test/resources";
    var settings = new MapSettings()
      .setProperty(BridgeServerImpl.SONARLINT_BUNDLE_PATH, deployLocation);
    context.setSettings(settings);

    var config = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServerLazily(config);
    assertThat(logTester.logs(DEBUG)).contains(
      "Setting deploy location to " + deployLocation.replace("/", File.separator)
    );
  }

  @Test
  void should_fail_on_bad_bridge_path() {
    bridgeServer = createBridgeServer(new BundleImpl());
    var deployLocation = "src/test";
    var settings = new MapSettings()
      .setProperty(BridgeServerImpl.SONARLINT_BUNDLE_PATH, deployLocation);
    context.setSettings(settings);

    var config = BridgeServerConfig.fromSensorContext(context);
    assertThatThrownBy(() -> bridgeServer.startServerLazily(config)).isInstanceOf(
      NodeCommandException.class
    );
  }

  private BridgeServerImpl createBridgeServer(Bundle bundle) {
    return new BridgeServerImpl(
      builder(),
      TEST_TIMEOUT_SECONDS,
      bundle,
      emptyRulesBundles,
      deprecationWarning,
      tempFolder,
      unsupportedEmbeddedRuntime
    );
  }

  private BridgeServerImpl createBridgeServer(String startServerScript) {
    return createBridgeServer(new TestBundle(startServerScript));
  }

  /**
   * Mock used to bypass the embedded node deployment
   */
  private Environment createUnsupportedEnvironment() {
    Environment mockEnvironment = mock(Environment.class);
    when(mockEnvironment.getSonarUserHome()).thenReturn(Path.of(""));
    when(mockEnvironment.getOsName()).thenReturn("");
    when(mockEnvironment.getOsArch()).thenReturn("");
    return mockEnvironment;
  }

  static class TestBundle implements Bundle {

    final String startServerScript;

    TestBundle(String startServerScript) {
      this.startServerScript = startServerScript;
    }

    @Override
    public void setDeployLocation(Path deployLocation) {
      // no-op for unit test
    }

    @Override
    public void deploy(Path deployLocation) {
      // no-op for unit test
    }

    @Override
    public String startServerScript() {
      return "src/test/resources/mock-bridge/" + startServerScript;
    }

    @Override
    public String resolve(String relativePath) {
      File file = new File("src/test/resources");
      return new File(file.getAbsoluteFile(), relativePath).getAbsolutePath();
    }
  }

  private static NodeCommandBuilder builder() {
    return new NodeCommandBuilderImpl(new ProcessWrapperImpl()).configuration(
      new MapSettings().asConfig()
    );
  }
}
