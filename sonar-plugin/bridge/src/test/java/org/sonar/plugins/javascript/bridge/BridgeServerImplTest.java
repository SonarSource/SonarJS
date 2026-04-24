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
import static org.mockito.ArgumentMatchers.anyLong;
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

import com.google.protobuf.ByteString;
import io.grpc.ConnectivityState;
import io.grpc.ManagedChannel;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
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
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectServiceGrpc;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectStreamResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectUnaryResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileStatus;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileType;
import org.sonar.plugins.javascript.analyzeproject.grpc.Issue;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisFileResult;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectFileInput;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.nodejs.NodeCommand;
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
    bridgeServer = createUnitBridgeServer();
    var stub = mock(AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub.class);

    DefaultInputFile inputFile = TestInputFileBuilder.create("foo", "foo.ts")
      .setContents("alert('Fly, you fools!')")
      .build();

    try (
      MockedStatic<AnalyzeProjectServiceGrpc> mockedGrpc = mockBlockingStub(bridgeServer, stub)
    ) {
      var requestCaptor = org.mockito.ArgumentCaptor.forClass(AnalyzeProjectRequest.class);
      when(stub.analyzeProjectUnary(requestCaptor.capture())).thenReturn(
        createUnaryResponse(inputFile, false)
      );

      assertThat(analyzeSingleFile(bridgeServer, inputFile, false).issues()).hasSize(1);
      assertThat(requestCaptor.getValue().getFilesMap()).containsKey(inputFile.absolutePath());
    }
  }

  private static DefaultInputFile createInputFile() {
    return TestInputFileBuilder.create("foo", "foo.js")
      .setContents("alert('Fly, you fools!')")
      .build();
  }

  private static AnalyzeProjectRequest createProjectRequest(
    DefaultInputFile inputFile,
    boolean skipAst
  ) throws IOException {
    var fileType =
      inputFile.type() == null
        ? FileType.FILE_TYPE_MAIN
        : AnalyzeProjectMessages.toProtoFileType(inputFile.type());
    var fileStatus =
      inputFile.status() == null
        ? FileStatus.FILE_STATUS_ADDED
        : AnalyzeProjectMessages.toProtoFileStatus(inputFile.status());

    return AnalyzeProjectRequest.newBuilder()
      .setConfiguration(
        AnalyzeProjectMessages.newProjectConfigurationBuilder(
          inputFile.absolutePath(),
          TEST_ANALYSIS_CONFIGURATION
        )
          .setSkipAst(skipAst)
          .build()
      )
      .putAllFiles(
        Map.of(
          inputFile.absolutePath(),
          ProjectFileInput.newBuilder()
            .setFileType(fileType)
            .setFileStatus(fileStatus)
            .setFileContent(inputFile.contents())
            .build()
        )
      )
      .build();
  }

  private static AnalysisResponse analyzeSingleFile(
    BridgeServerImpl bridgeServer,
    DefaultInputFile inputFile,
    boolean skipAst
  ) throws IOException {
    var output = bridgeServer.analyzeProject(createProjectRequest(inputFile, skipAst));
    var response = toSingleFileResponse(output, inputFile.absolutePath());
    if (response.getAst().isEmpty()) {
      return new AnalysisResponse(response.getIssuesList(), null);
    }
    try {
      return new AnalysisResponse(
        response.getIssuesList(),
        AstProtoUtils.readProtobufFromBytes(response.getAst().toByteArray())
      );
    } catch (IOException e) {
      throw new IllegalStateException("Failed to parse protobuf", e);
    }
  }

  private static ProjectAnalysisFileResult toSingleFileResponse(
    AnalyzeProjectUnaryResponse output,
    String filePath
  ) {
    var response = output.getFilesMap().get(filePath);
    if (response == null && output.getFilesCount() == 1) {
      response = output.getFilesMap().values().iterator().next();
    }
    return response == null ? ProjectAnalysisFileResult.getDefaultInstance() : response;
  }

  private record AnalysisResponse(List<Issue> issues, Node ast) {}

  private ProjectAnalysisHandler createStreamingHandler(DefaultInputFile inputFile, boolean skipAst)
    throws IOException {
    var request = createProjectRequest(inputFile, skipAst);
    var future = new CompletableFuture<Void>();
    return new ProjectAnalysisHandler() {
      @Override
      public AnalyzeProjectRequest getRequest() {
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
      public void handleMessage(AnalyzeProjectStreamResponse message) {
        if (message.getMessageCase() == AnalyzeProjectStreamResponse.MessageCase.META) {
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
    bridgeServer = createUnitBridgeServer();
    assertThat(bridgeServer.getCommandInfo()).isEqualTo(
      "Node.js command to start the bridge server was not built yet."
    );

    var nodeCommand = mock(NodeCommand.class);
    when(nodeCommand.toString()).thenReturn("node " + START_SERVER_SCRIPT);
    setPrivateField(bridgeServer, "nodeCommand", nodeCommand);

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
  void test_use_existing_node_should_validate_port_configuration_and_reuse_alive_process()
    throws Exception {
    String starting = "Creating Node.js process to start the bridge server on port";
    var useExisting = "Using existing Node.js process on port 60000";
    var alreadyStarted = "The bridge server is up, no need to start.";
    var wrongPortRange =
      "Node.js process port set in $SONARJS_EXISTING_NODE_PROCESS_PORT should be a number between 1 and 65535 range";
    var wrongPortValue =
      "Error parsing number in environment variable SONARJS_EXISTING_NODE_PROCESS_PORT";

    bridgeServer = spy(createUnitBridgeServer(SHORT_STARTUP_TIMEOUT_SECONDS));
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
    logTester.clear();

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
    logTester.clear();
    clearInvocations(bridgeServerMock);

    doReturn("60000").when(bridgeServerMock).getExistingNodeProcessPort();
    doReturn(true).when(bridgeServerMock).waitChannelReady(startupTimeoutMillis);
    doReturn(true).when(bridgeServerMock).isAlive();
    bridgeServerMock.startServerLazily(serverConfig);
    verify(bridgeServerMock).waitChannelReady(startupTimeoutMillis);
    verify(bridgeServerMock, never()).waitServerToStart(startupTimeoutMillis);
    verify(bridgeServerMock, never()).deploy(any());
    verify(bridgeServerMock, never()).startServer(any());
    assertThat(logTester.logs(INFO)).contains(useExisting);
    assertThat(logTester.logs(DEBUG)).contains(alreadyStarted);
  }

  @Test
  void test_use_existing_node_should_start_local_process_when_port_is_zero() throws Exception {
    bridgeServer = spy(createUnitBridgeServer(SHORT_STARTUP_TIMEOUT_SECONDS));
    var bridgeServerMock = bridgeServer;

    doReturn("0").when(bridgeServerMock).getExistingNodeProcessPort();
    doReturn(false).when(bridgeServerMock).isAlive();
    doAnswer(invocation -> null)
      .when(bridgeServerMock)
      .deploy(any());
    doAnswer(invocation -> null)
      .when(bridgeServerMock)
      .startServer(any());

    bridgeServerMock.startServerLazily(serverConfig);

    verify(bridgeServerMock).deploy(serverConfig.config());
    verify(bridgeServerMock).startServer(serverConfig);
  }

  @Test
  void isAlive_should_not_require_a_lease_for_an_existing_node_process() throws Exception {
    bridgeServer = createUnitBridgeServer();
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
  void should_cancel_streaming_analysis_while_waiting_for_the_next_message() throws Exception {
    bridgeServer = createBridgeServer("slowStream.js", SHORT_STARTUP_TIMEOUT_SECONDS);
    bridgeServer.startServer(serverConfig);

    var handler = createStreamingHandler(createInputFile(), false);
    var failure = new AtomicReference<Throwable>();
    var completed = new CountDownLatch(1);
    var worker = new Thread(() -> {
      try {
        bridgeServer.analyzeProject(handler);
      } catch (Throwable throwable) {
        failure.set(throwable);
      } finally {
        completed.countDown();
      }
    });

    var start = System.nanoTime();
    worker.start();
    Thread.sleep(200);
    context.setCancelled(true);

    assertThat(completed.await(1, TimeUnit.SECONDS)).isTrue();
    assertThat(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start)).isLessThan(1_000);
    assertThat(failure.get())
      .isInstanceOf(CompletionException.class)
      .hasCauseInstanceOf(CancellationException.class);
  }

  @Test
  void should_fail_when_stream_ends_without_project_metadata() throws Exception {
    bridgeServer = createUnitBridgeServer();
    var stub = mock(AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub.class);
    var handler = createStreamingHandler(createInputFile(), false);

    try (
      MockedStatic<AnalyzeProjectServiceGrpc> mockedGrpc = mockBlockingStub(bridgeServer, stub)
    ) {
      when(stub.analyzeProject(any(AnalyzeProjectRequest.class))).thenReturn(
        List.<AnalyzeProjectStreamResponse>of().iterator()
      );

      assertThatThrownBy(() -> bridgeServer.analyzeProject(handler))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining(
          "Analyzer runtime completed the project-analysis stream without sending project metadata"
        )
        .hasMessageNotContaining("The bridge server is unresponsive");
    }
  }

  @Test
  void should_surface_stream_runtime_errors() throws Exception {
    bridgeServer = createUnitBridgeServer();
    var stub = mock(AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub.class);

    var future = new CompletableFuture<Void>();
    var handler = new ProjectAnalysisHandler() {
      @Override
      public AnalyzeProjectRequest getRequest() {
        return AnalyzeProjectRequest.getDefaultInstance();
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
      public void handleMessage(AnalyzeProjectStreamResponse message) {
        throw new AssertionError("No streamed message should be emitted for invalid requests");
      }
    };

    try (
      MockedStatic<AnalyzeProjectServiceGrpc> mockedGrpc = mockBlockingStub(bridgeServer, stub)
    ) {
      when(stub.analyzeProject(any(AnalyzeProjectRequest.class))).thenThrow(
        Status.INVALID_ARGUMENT.withDescription(
          "configuration.base_dir is required"
        ).asRuntimeException()
      );

      assertThatThrownBy(() -> bridgeServer.analyzeProject(handler))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining(
          "Received error from analyzer runtime: configuration.base_dir is required"
        )
        .hasMessageNotContaining("The bridge server is unresponsive");
    }
  }

  @Test
  void should_surface_unary_runtime_errors() throws Exception {
    bridgeServer = createUnitBridgeServer();
    var stub = mock(AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub.class);

    try (
      MockedStatic<AnalyzeProjectServiceGrpc> mockedGrpc = mockBlockingStub(bridgeServer, stub)
    ) {
      when(stub.analyzeProjectUnary(any(AnalyzeProjectRequest.class))).thenThrow(
        Status.INTERNAL.withDescription("worker crashed").asRuntimeException()
      );

      assertThatThrownBy(() ->
        bridgeServer.analyzeProject(AnalyzeProjectRequest.getDefaultInstance())
      )
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Received error from analyzer runtime: worker crashed")
        .hasMessageNotContaining("The bridge server is unresponsive");
    }
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
  void should_extract_startup_port_from_fixed_log_message() {
    assertThat(
      BridgeServerImpl.extractStartupPort(
        "gRPC analyze-project server listening on 127.0.0.1:4040"
      )
    )
      .isEqualTo(4040);
    assertThat(
      BridgeServerImpl.extractStartupPort(
        "gRPC analyze-project server listening on 2001:db8::1:4040"
      )
    )
      .isEqualTo(4040);
  }

  @Test
  void should_ignore_malformed_startup_port_messages() {
    assertThat(BridgeServerImpl.extractStartupPort("WARN unrelated log line")).isNull();
    assertThat(
      BridgeServerImpl.extractStartupPort(
        "gRPC analyze-project server listening on localhost:not-a-port"
      )
    )
      .isNull();
    assertThat(
      BridgeServerImpl.extractStartupPort("gRPC analyze-project server listening on localhost:")
    )
      .isNull();
  }

  @Test
  void waitServerToStart_can_be_interrupted() throws Exception {
    bridgeServer = createUnitBridgeServer();
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
    worker.join(TimeUnit.SECONDS.toMillis(1));
    assertThat(worker.isAlive()).isFalse();
  }

  @Test
  void waitChannelReady_should_continue_polling_when_state_does_not_change() throws Exception {
    bridgeServer = createUnitBridgeServer();
    var channel = mock(ManagedChannel.class);
    when(channel.getState(true)).thenReturn(ConnectivityState.CONNECTING);
    when(channel.getState(false)).thenReturn(ConnectivityState.READY);
    var notifications = new AtomicInteger();
    doAnswer(invocation -> {
      var onStateChanged = invocation.getArgument(1, Runnable.class);
      if (notifications.incrementAndGet() == 2) {
        CompletableFuture.runAsync(onStateChanged);
      }
      return null;
    })
      .when(channel)
      .notifyWhenStateChanged(any(ConnectivityState.class), any(Runnable.class));
    setPrivateField(bridgeServer, "channel", channel);

    assertThat(bridgeServer.waitChannelReady(500)).isTrue();
    assertThat(notifications.get()).isEqualTo(2);
  }

  @Test
  void onLeaseTerminated_should_ignore_duplicate_notifications() throws Exception {
    bridgeServer = createUnitBridgeServer();
    logTester.clear();
    setPrivateField(bridgeServer, "leaseObserver", null);
    setPrivateBooleanField(bridgeServer, "leaseTerminated", true);

    invokeOnLeaseTerminated(new RuntimeException("boom"));

    assertThat(logTester.logs(DEBUG)).doesNotContain(
      "Analyze-project lease terminated unexpectedly"
    );
  }

  @Test
  void onLeaseTerminated_should_only_log_unexpected_errors() throws Exception {
    bridgeServer = createUnitBridgeServer();
    var channel = mock(ManagedChannel.class);
    when(channel.isShutdown()).thenReturn(false);
    logTester.clear();
    setPrivateField(bridgeServer, "channel", channel);
    setPrivateField(bridgeServer, "leaseObserver", mock(StreamObserver.class));
    setPrivateBooleanField(bridgeServer, "leaseTerminated", false);

    invokeOnLeaseTerminated(null);
    assertThat(logTester.logs(DEBUG)).doesNotContain(
      "Analyze-project lease terminated unexpectedly"
    );

    logTester.clear();
    setPrivateField(bridgeServer, "leaseObserver", mock(StreamObserver.class));
    setPrivateBooleanField(bridgeServer, "leaseTerminated", false);
    invokeOnLeaseTerminated(new RuntimeException("boom"));
    assertThat(logTester.logs(DEBUG)).contains("Analyze-project lease terminated unexpectedly");
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
    bridgeServer = createUnitBridgeServer();
    var nodeCommand = mock(NodeCommand.class);
    when(nodeCommand.getActualNodeVersion()).thenReturn(Version.create(20, 1));
    when(nodeCommand.getNodeExecutableOrigin()).thenReturn("embedded");
    setPrivateField(bridgeServer, "nodeCommand", nodeCommand);

    var telemetry = bridgeServer.getTelemetry();
    var runtimeTelemetry = telemetry.runtimeTelemetry();

    assertThat(runtimeTelemetry.version()).isEqualTo(Version.create(20, 1));
    assertThat(runtimeTelemetry.nodeExecutableOrigin()).isEqualTo("embedded");
  }

  @Test
  void should_return_an_ast() throws Exception {
    bridgeServer = createUnitBridgeServer();
    var stub = mock(AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub.class);
    var inputFile = createInputFile();

    try (
      MockedStatic<AnalyzeProjectServiceGrpc> mockedGrpc = mockBlockingStub(bridgeServer, stub)
    ) {
      when(stub.analyzeProjectUnary(any(AnalyzeProjectRequest.class))).thenReturn(
        createUnaryResponse(inputFile, true)
      );

      var response = analyzeSingleFile(bridgeServer, inputFile, false);
      assertThat(response.ast()).isNotNull();
      Node node = response.ast();
      assertThat(node.getProgram()).isNotNull();
      assertThat(node.getProgram().getBodyList().get(0).getExpressionStatement()).isNotNull();
    }
  }

  @Test
  void should_omit_an_ast_if_skipAst_flag_is_set() throws Exception {
    bridgeServer = createUnitBridgeServer();
    var stub = mock(AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub.class);
    var inputFile = createInputFile();

    try (
      MockedStatic<AnalyzeProjectServiceGrpc> mockedGrpc = mockBlockingStub(bridgeServer, stub)
    ) {
      var requestCaptor = org.mockito.ArgumentCaptor.forClass(AnalyzeProjectRequest.class);
      when(stub.analyzeProjectUnary(requestCaptor.capture())).thenReturn(
        createUnaryResponse(inputFile, false)
      );

      var response = analyzeSingleFile(bridgeServer, inputFile, true);
      assertThat(response.ast()).isNull();
      assertThat(requestCaptor.getValue().getConfiguration().getSkipAst()).isTrue();
    }
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

  private BridgeServerImpl createUnitBridgeServer() {
    return createBridgeServer(mock(Bundle.class));
  }

  private BridgeServerImpl createUnitBridgeServer(int timeoutSeconds) {
    return createBridgeServer(timeoutSeconds, mock(Bundle.class));
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

  private MockedStatic<AnalyzeProjectServiceGrpc> mockBlockingStub(
    BridgeServerImpl bridgeServer,
    AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub stub
  ) throws Exception {
    var channel = mock(ManagedChannel.class);
    setPrivateField(bridgeServer, "channel", channel);
    MockedStatic<AnalyzeProjectServiceGrpc> mockedGrpc = mockStatic(
      AnalyzeProjectServiceGrpc.class
    );
    when(stub.withDeadlineAfter(anyLong(), any(TimeUnit.class))).thenReturn(stub);
    mockedGrpc.when(() -> AnalyzeProjectServiceGrpc.newBlockingStub(channel)).thenReturn(stub);
    return mockedGrpc;
  }

  private static AnalyzeProjectUnaryResponse createUnaryResponse(
    DefaultInputFile inputFile,
    boolean includeAst
  ) throws IOException {
    var fileResult = ProjectAnalysisFileResult.newBuilder().addIssues(Issue.newBuilder().build());
    if (includeAst) {
      fileResult.setAst(ByteString.copyFrom(getSerializedProtoData()));
    }
    return AnalyzeProjectUnaryResponse.newBuilder()
      .putFiles(inputFile.absolutePath(), fileResult.build())
      .build();
  }

  private static byte[] getSerializedProtoData() throws IOException {
    return Files.readAllBytes(resolveTestFile("serialized.proto"));
  }

  private static Path resolveTestFile(String fileName) {
    var path = Path.of("src", "test", "resources", "files", fileName);
    if (path.toFile().exists()) {
      return path;
    }
    return Path.of("sonar-plugin", "bridge", "src", "test", "resources", "files", fileName);
  }

  private void invokeOnLeaseTerminated(Throwable throwable) throws Exception {
    var method = BridgeServerImpl.class.getDeclaredMethod("onLeaseTerminated", Throwable.class);
    method.setAccessible(true);
    method.invoke(bridgeServer, throwable);
  }

  private static void setPrivateBooleanField(
    BridgeServerImpl bridgeServer,
    String fieldName,
    boolean value
  ) throws Exception {
    var field = BridgeServerImpl.class.getDeclaredField(fieldName);
    field.setAccessible(true);
    field.setBoolean(bridgeServer, value);
  }

  private static void setPrivateField(BridgeServerImpl bridgeServer, String fieldName, Object value)
    throws Exception {
    var field = BridgeServerImpl.class.getDeclaredField(fieldName);
    field.setAccessible(true);
    field.set(bridgeServer, value);
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
