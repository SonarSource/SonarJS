/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.slf4j.event.Level.DEBUG;
import static org.slf4j.event.Level.INFO;
import static org.slf4j.event.Level.WARN;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_FORCE_HOST_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.SKIP_NODE_PROVISIONING_PROPERTY;

import com.google.gson.JsonObject;
import io.grpc.ConnectivityState;
import io.grpc.ManagedChannel;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.MockedStatic;
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
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilder;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;
import org.sonar.plugins.javascript.nodejs.ProcessWrapper;
import org.sonar.plugins.javascript.nodejs.ProcessWrapperImpl;

class BridgeServerImplTest {

  private static final String START_SERVER_SCRIPT = "startServer.js";
  private static final int SHORT_STARTUP_TIMEOUT_SECONDS = 3;
  private static final AnalysisConfiguration TEST_ANALYSIS_CONFIGURATION =
    new AnalysisConfiguration() {
      @Override
      public long getMaxFileSizeProperty() {
        return Long.MAX_VALUE / 1024;
      }

      @Override
      public boolean shouldDetectBundles() {
        return false;
      }

      @Override
      public boolean canAccessFileSystem() {
        return false;
      }

      @Override
      public boolean shouldCreateTSProgramForOrphanFiles() {
        return false;
      }

      @Override
      public boolean shouldDisableTypeChecking() {
        return true;
      }
    };

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
    var response = analyzeSingleFile(bridgeServer, createInputFile(), false);
    assertThat(response.issues()).hasSize(1);
  }

  @Test
  void should_get_answer_from_server_for_ts_request() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.ts")
      .setContents("alert('Fly, you fools!')")
      .build();
    assertThat(analyzeSingleFile(bridgeServer, inputFile, false).issues()).hasSize(1);
  }

  private static DefaultInputFile createInputFile() {
    return TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
  }

  private static BridgeServer.ProjectAnalysisRequest createProjectRequest(
    DefaultInputFile inputFile,
    boolean skipAst
  ) throws IOException {
    var configuration = new BridgeServer.ProjectAnalysisConfiguration(
      inputFile.absolutePath(),
      TEST_ANALYSIS_CONFIGURATION
    );
    configuration.setSkipAst(skipAst);
    return new BridgeServer.ProjectAnalysisRequest(
      Map.of(
        inputFile.absolutePath(),
        new BridgeServer.JsTsFile(
          inputFile.absolutePath(),
          inputFile.type().toString(),
          inputFile.status(),
          inputFile.contents()
        )
      ),
      List.of(),
      configuration
    );
  }

  private static BridgeServer.AnalysisResponse analyzeSingleFile(
    BridgeServerImpl bridgeServer,
    DefaultInputFile inputFile,
    boolean skipAst
  ) throws IOException {
    var output = bridgeServer.analyzeProject(createProjectRequest(inputFile, skipAst));
    var responseDto = output.files().get(inputFile.absolutePath());
    if (responseDto == null && !output.files().isEmpty()) {
      responseDto = output.files().values().iterator().next();
    }
    return responseDto == null
      ? new BridgeServer.AnalysisResponse()
      : BridgeServer.AnalysisResponse.fromDTO(responseDto);
  }

  private WebSocketMessageHandler<BridgeServer.ProjectAnalysisRequest> createStreamingHandler(
    DefaultInputFile inputFile,
    boolean skipAst
  ) throws IOException {
    var request = createProjectRequest(inputFile, skipAst);
    var future = new CompletableFuture<Void>();
    return new WebSocketMessageHandler<>() {
      @Override
      public BridgeServer.ProjectAnalysisRequest getRequest() {
        return request;
      }

      @Override
      public SensorContextTester getContext() {
        return context;
      }

      @Override
      public CompletableFuture<Void> getFuture() {
        return future;
      }

      @Override
      public void handleMessage(JsonObject message) {
        if ("meta".equals(message.get("messageType").getAsString())) {
          future.complete(null);
        }
      }
    };
  }

  @Test
  void should_throw_if_failed_to_start() {
    bridgeServer = createBridgeServer("throw.js", SHORT_STARTUP_TIMEOUT_SECONDS);

    assertThatThrownBy(() -> bridgeServer.startServer(serverConfig))
      .isInstanceOf(NodeCommandException.class)
      .hasMessage(
        "Failed to start the bridge server (" + SHORT_STARTUP_TIMEOUT_SECONDS + "s timeout)"
      );
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
    assertThat(
      logTester
        .logs(DEBUG)
        .stream()
        .anyMatch(s -> s.startsWith(starting))
    ).isTrue();
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    logTester.clear();
    bridgeServer.startServerLazily(serverConfig);
    assertThat(
      logTester
        .logs(DEBUG)
        .stream()
        .noneMatch(s -> s.startsWith(starting))
    ).isTrue();
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

    bridgeServer = spy(createBridgeServer("startServer.js", SHORT_STARTUP_TIMEOUT_SECONDS));
    var bridgeServerMock = bridgeServer;
    var startupTimeoutMillis = (int) TimeUnit.SECONDS.toMillis(SHORT_STARTUP_TIMEOUT_SECONDS);
    doReturn("70000").when(bridgeServerMock).getExistingNodeProcessPort();
    assertThatThrownBy(() -> bridgeServerMock.startServerLazily(serverConfig))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage(wrongPortRange);
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    assertThat(
      logTester
        .logs(DEBUG)
        .stream()
        .noneMatch(s -> s.startsWith(starting))
    ).isTrue();

    doReturn("a").when(bridgeServerMock).getExistingNodeProcessPort();
    assertThatThrownBy(() -> bridgeServerMock.startServerLazily(serverConfig))
      .isInstanceOf(IllegalStateException.class)
      .hasMessage(wrongPortValue);
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    assertThat(
      logTester
        .logs(DEBUG)
        .stream()
        .noneMatch(s -> s.startsWith(starting))
    ).isTrue();

    //Port 0 will be considered as not set, and a new node process will be started on a random port
    doReturn("0").when(bridgeServerMock).getExistingNodeProcessPort();
    bridgeServerMock.startServerLazily(serverConfig);
    assertThat(
      logTester
        .logs(DEBUG)
        .stream()
        .anyMatch(s -> s.startsWith(starting))
    ).isTrue();
    assertThat(logTester.logs(DEBUG)).doesNotContain(alreadyStarted);
    bridgeServerMock.clean();
    clearInvocations(bridgeServerMock);

    doReturn("60000").when(bridgeServerMock).getExistingNodeProcessPort();
    doReturn(true).when(bridgeServerMock).waitChannelReady(startupTimeoutMillis);
    doReturn(true).when(bridgeServerMock).isAlive();
    bridgeServerMock.startServerLazily(serverConfig);
    verify(bridgeServerMock).waitChannelReady(startupTimeoutMillis);
    verify(bridgeServerMock, never()).waitServerToStart(startupTimeoutMillis);
    assertThat(logTester.logs(INFO)).contains(useExisting);
    assertThat(logTester.logs(DEBUG)).contains(alreadyStarted);
  }

  @Test
  void isAlive_should_not_require_a_lease_for_an_existing_node_process() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    var channel = mock(ManagedChannel.class);
    when(channel.isShutdown()).thenReturn(false);
    when(channel.getState(false)).thenReturn(ConnectivityState.READY);

    var statusField = BridgeServerImpl.class.getDeclaredField("status");
    statusField.setAccessible(true);
    var startedStatus = java.util.Arrays.stream(statusField.getType().getEnumConstants())
      .filter(status -> "STARTED".equals(status.toString()))
      .findFirst()
      .orElseThrow();
    statusField.set(bridgeServer, startedStatus);

    var channelField = BridgeServerImpl.class.getDeclaredField("channel");
    channelField.setAccessible(true);
    channelField.set(bridgeServer, channel);

    var ownsNodeProcessField = BridgeServerImpl.class.getDeclaredField("ownsNodeProcess");
    ownsNodeProcessField.setAccessible(true);
    ownsNodeProcessField.setBoolean(bridgeServer, false);

    assertThat(bridgeServer.isAlive()).isTrue();
  }

  @Test
  void should_throw_special_exception_when_failed_start_server_before() {
    bridgeServer = createBridgeServer("throw.js", SHORT_STARTUP_TIMEOUT_SECONDS);
    String failedToStartExceptionMessage =
      "Failed to start the bridge server (" + SHORT_STARTUP_TIMEOUT_SECONDS + "s timeout)";
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

    DefaultInputFile inputFile = createInputFile();
    assertThatThrownBy(() ->
      bridgeServer.analyzeProject(createProjectRequest(inputFile, false))
    ).isInstanceOf(IllegalStateException.class);
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
  void should_allow_slow_streaming_analysis_without_timeout() throws Exception {
    bridgeServer = createBridgeServer("slowStream.js", SHORT_STARTUP_TIMEOUT_SECONDS);
    bridgeServer.startServer(serverConfig);

    var start = System.nanoTime();
    bridgeServer.analyzeProject(createStreamingHandler(createInputFile(), false));

    assertThat(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start)).isGreaterThan(1_000);
  }

  @Test
  void test_rule_tostring() {
    EslintRule rule = new EslintRule(
      "key",
      emptyList(),
      Collections.singletonList(InputFile.Type.MAIN),
      singletonList(AnalysisMode.DEFAULT),
      emptyList(),
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

  @ParameterizedTest
  @ValueSource(strings = { "0", "3" })
  void should_pass_node_timeout(String nodeTimeout) throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    context.setSettings(
      new MapSettings().setProperty(BridgeServerImpl.NODE_TIMEOUT_PROPERTY, nodeTimeout)
    );
    BridgeServerConfig serverConfigForDebugMemory = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServer(serverConfigForDebugMemory);
    bridgeServer.stop();

    assertThat(logTester.logs()).contains(String.format("nodeTimeout: %s", nodeTimeout));
  }

  @Test
  void should_handle_no_node_timeout_provided() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    BridgeServerConfig serverConfigForDebugMemory = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServer(serverConfigForDebugMemory);
    bridgeServer.stop();

    assertThat(logTester.logs()).contains(
      String.format("nodeTimeout: %s", BridgeServerImpl.DEFAULT_NODE_SHUTDOWN_TIMEOUT_MS)
    );
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
  void waitServerToStart_can_be_interrupted() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    var channel = mock(ManagedChannel.class);
    when(channel.getState(true)).thenReturn(ConnectivityState.CONNECTING);
    when(channel.getState(false)).thenReturn(ConnectivityState.CONNECTING);
    CountDownLatch waitingForStateChange = new CountDownLatch(1);
    doAnswer(invocation -> {
      waitingForStateChange.countDown();
      return null;
    })
      .when(channel)
      .notifyWhenStateChanged(any(ConnectivityState.class), any(Runnable.class));
    var channelField = BridgeServerImpl.class.getDeclaredField("channel");
    channelField.setAccessible(true);
    channelField.set(bridgeServer, channel);

    CountDownLatch workerCompleted = new CountDownLatch(1);
    Thread worker = new Thread(() -> {
      try {
        bridgeServer.waitServerToStart((int) TimeUnit.MINUTES.toMillis(1));
      } finally {
        workerCompleted.countDown();
      }
    });
    worker.start();
    assertThat(waitingForStateChange.await(1, TimeUnit.SECONDS)).isTrue();

    worker.interrupt();
    assertThat(workerCompleted.await(1, TimeUnit.SECONDS)).isTrue();
    assertThat(worker.isAlive()).isFalse();
  }

  @Test
  void enabled_monitoring() throws Exception {
    bridgeServer = new BridgeServerImpl(
      builder(),
      new TestBundle(START_SERVER_SCRIPT),
      emptyRulesBundles,
      deprecationWarning,
      tempFolder,
      unsupportedEmbeddedRuntime
    );
    bridgeServer.startServerLazily(serverConfig);
    bridgeServer.stop();
    assertThat(
      logTester
        .logs(INFO)
        .stream()
        .anyMatch(s -> s.startsWith("no-commented-code"))
    ).isTrue();
    assertThat(
      logTester
        .logs(INFO)
        .stream()
        .anyMatch(s -> s.startsWith("arguments-order"))
    ).isTrue();
    assertThat(
      logTester
        .logs(INFO)
        .stream()
        .anyMatch(s -> s.startsWith("deprecation"))
    ).isTrue();
  }

  @Test
  void should_return_telemetry() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);
    var telemetry = bridgeServer.getTelemetry();
    var runtimeTelemetry = telemetry.runtimeTelemetry();

    // todo: we should test here against either a controlled version of Node.js, or the lowest version that we officially support
    assertThat(runtimeTelemetry.version().isGreaterThanOrEqual(Version.create(18, 0))).isTrue();
    assertThat(runtimeTelemetry.nodeExecutableOrigin()).isNotEmpty();
  }

  @Test
  void should_return_an_ast() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);
    var response = analyzeSingleFile(bridgeServer, createInputFile(), false);
    assertThat(response.ast()).isNotNull();
    Node node = response.ast();
    assertThat(node.getProgram()).isNotNull();
    assertThat(node.getProgram().getBodyList().get(0).getExpressionStatement()).isNotNull();
  }

  @Test
  void should_handle_io_exception() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(serverConfig);
    var inputFile = createInputFile();
    try (MockedStatic<AstProtoUtils> mocked = mockStatic(AstProtoUtils.class)) {
      mocked
        .when(() -> AstProtoUtils.parseProtobuf(any()))
        .thenThrow(new IOException("Test exception"));
      assertThatThrownBy(() -> analyzeSingleFile(bridgeServer, inputFile, false))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Failed to parse protobuf");
    }
  }

  @Test
  void should_omit_an_ast_if_skipAst_flag_is_set() throws Exception {
    bridgeServer = createBridgeServer(START_SERVER_SCRIPT);
    bridgeServer.startServer(BridgeServerConfig.fromSensorContext(context));

    var response = analyzeSingleFile(bridgeServer, createInputFile(), true);
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
    assertThatThrownBy(() ->
      bridgeServer.startServerLazily(serverConfigForExecutableProperty)
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
  void should_start_bridge_from_path() throws IOException, InterruptedException {
    bridgeServer = createBridgeServer(new BundleImpl());
    var deployLocation = Path.of("src", "test", "resources");
    if (!deployLocation.toFile().exists()) {
      deployLocation = Path.of("sonar-plugin", "bridge", "src", "test", "resources");
    }
    var settings = new MapSettings().setProperty(
      BridgeServerImpl.SONARLINT_BUNDLE_PATH,
      deployLocation.toString()
    );
    context.setSettings(settings);

    var config = BridgeServerConfig.fromSensorContext(context);
    bridgeServer.startServerLazily(config);
    assertThat(logTester.logs(DEBUG)).contains("Setting deploy location to " + deployLocation);
  }

  @Test
  void should_fail_on_bad_bridge_path() {
    bridgeServer = createBridgeServer(new BundleImpl());
    var deployLocation = "src/test";
    var settings = new MapSettings().setProperty(
      BridgeServerImpl.SONARLINT_BUNDLE_PATH,
      deployLocation
    );
    context.setSettings(settings);

    var config = BridgeServerConfig.fromSensorContext(context);
    assertThatThrownBy(() -> bridgeServer.startServerLazily(config)).isInstanceOf(
      NodeCommandException.class
    );
  }

  private BridgeServerImpl createBridgeServer(Bundle bundle) {
    return new BridgeServerImpl(
      builder(),
      bundle,
      emptyRulesBundles,
      deprecationWarning,
      tempFolder,
      unsupportedEmbeddedRuntime
    );
  }

  private BridgeServerImpl createBridgeServer(String startServerScript, int timeoutSeconds) {
    return createBridgeServer(timeoutSeconds, new TestBundle(startServerScript));
  }

  private BridgeServerImpl createBridgeServer(int timeoutSeconds, Bundle bundle) {
    return new BridgeServerImpl(
      builder(),
      timeoutSeconds,
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
      var relativeLocation = Path.of("src", "test", "resources", "mock-bridge", startServerScript);
      if (relativeLocation.toFile().exists()) {
        return relativeLocation.toString();
      }
      return Path.of(
        "sonar-plugin",
        "bridge",
        "src",
        "test",
        "resources",
        "mock-bridge",
        startServerScript
      ).toString();
    }

    @Override
    public String resolve(String relativePath) {
      File file = new File("src/test/resources");
      if (!file.exists()) {
        file = new File("sonar-plugin/bridge/src/test/resources");
      }
      return new File(file.getAbsoluteFile(), relativePath).getAbsolutePath();
    }
  }

  private static NodeCommandBuilder builder() {
    return new NodeCommandBuilderImpl(new ProcessWrapperImpl()).configuration(
      new MapSettings().asConfig()
    );
  }
}
