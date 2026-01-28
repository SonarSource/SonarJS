/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

import static org.sonar.plugins.javascript.bridge.NetUtils.findOpenPort;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_FORCE_HOST_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.SKIP_NODE_PROVISIONING_PROPERTY;

import io.grpc.StatusRuntimeException;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.TempFolder;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeCssRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeCssResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeHtmlRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeHtmlResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeJsTsRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeJsTsResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeYamlRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeYamlResponse;
import org.sonar.plugins.javascript.bridge.grpc.InitLinterRequest;
import org.sonar.plugins.javascript.bridge.grpc.InitLinterResponse;
import org.sonar.plugins.javascript.nodejs.NodeCommand;
import org.sonar.plugins.javascript.nodejs.NodeCommandBuilder;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;

public class BridgeServerImpl implements BridgeServer {

  private enum Status {
    NOT_STARTED,
    FAILED,
    STARTED,
  }

  private static final Logger LOG = LoggerFactory.getLogger(BridgeServerImpl.class);

  private static final int DEFAULT_TIMEOUT_SECONDS = 5 * 60;
  private static final int TIME_AFTER_FAILURE_TO_RESTART_MS = 60 * 1000;
  // internal property to set "--max-old-space-size" for Node process running this server
  private static final String MAX_OLD_SPACE_SIZE_PROPERTY = "sonar.javascript.node.maxspace";
  private static final String DEBUG_MEMORY = "sonar.javascript.node.debugMemory";
  private static final String TIMEOUT_ERROR_MESSAGE =
    "The bridge server is unresponsive. It might be because you don't have enough memory, " +
    "so please go see the troubleshooting section: " +
    "https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/languages/javascript-typescript-css/#slow-or-unresponsive-analysis";
  public static final String SONARLINT_BUNDLE_PATH = "sonar.js.internal.bundlePath";
  /**
   * The default timeout to shut down server if no request is received
   *
   * Normally, the Java plugin sends keepalive requests to the bridge
   * If the Java plugin crashes, this timeout will run out and shut down
   * the bridge to prevent it from becoming an orphan process.
   */
  public static final int DEFAULT_NODE_SHUTDOWN_TIMEOUT_MS = 15_000;
  public static final String NODE_TIMEOUT_PROPERTY = "sonar.javascript.node.timeout";
  public static final String SONARJS_EXISTING_NODE_PROCESS_PORT =
    "SONARJS_EXISTING_NODE_PROCESS_PORT";
  private static final String BRIDGE_DEPLOY_LOCATION = "bridge-bundle";

  private final NodeCommandBuilder nodeCommandBuilder;
  private final int timeoutSeconds;
  private final Bundle bundle;
  private final String hostAddress;
  private int port;
  private NodeCommand nodeCommand;
  private Status status = Status.NOT_STARTED;
  private final RulesBundles rulesBundles;
  private List<Path> deployedBundles = Collections.emptyList();
  private String workdir;
  private final NodeDeprecationWarning deprecationWarning;
  private final Path temporaryDeployLocation;
  private final EmbeddedNode embeddedNode;
  private static final int HEARTBEAT_INTERVAL_SECONDS = 5;
  private final ScheduledExecutorService heartbeatService;
  private ScheduledFuture<?> heartbeatFuture;
  private BridgeGrpcClient grpcClient;
  private Long latestOKIsAliveTimestamp;

  // Used by pico container for dependency injection
  public BridgeServerImpl(
    NodeCommandBuilder nodeCommandBuilder,
    Bundle bundle,
    RulesBundles rulesBundles,
    NodeDeprecationWarning deprecationWarning,
    TempFolder tempFolder,
    EmbeddedNode embeddedNode
  ) {
    this(
      nodeCommandBuilder,
      DEFAULT_TIMEOUT_SECONDS,
      bundle,
      rulesBundles,
      deprecationWarning,
      tempFolder,
      embeddedNode
    );
  }

  BridgeServerImpl(
    NodeCommandBuilder nodeCommandBuilder,
    int timeoutSeconds,
    Bundle bundle,
    RulesBundles rulesBundles,
    NodeDeprecationWarning deprecationWarning,
    TempFolder tempFolder,
    EmbeddedNode embeddedNode
  ) {
    this.nodeCommandBuilder = nodeCommandBuilder;
    this.timeoutSeconds = timeoutSeconds;
    this.bundle = bundle;
    this.rulesBundles = rulesBundles;
    this.deprecationWarning = deprecationWarning;
    this.hostAddress = InetAddress.getLoopbackAddress().getHostAddress();
    this.temporaryDeployLocation = tempFolder.newDir(BRIDGE_DEPLOY_LOCATION).toPath();
    this.heartbeatService = Executors.newSingleThreadScheduledExecutor();
    this.embeddedNode = embeddedNode;
  }

  void heartbeat() {
    LOG.trace("Pinging the bridge server");
    isAlive();
  }

  void serverHasStarted() {
    status = Status.STARTED;
    if (heartbeatFuture == null) {
      LOG.trace("Starting heartbeat service");
      heartbeatFuture = heartbeatService.scheduleAtFixedRate(
        this::heartbeat,
        HEARTBEAT_INTERVAL_SECONDS,
        HEARTBEAT_INTERVAL_SECONDS,
        TimeUnit.SECONDS
      );
    }
  }

  int getTimeoutSeconds() {
    return timeoutSeconds;
  }

  /**
   * Extracts the bridge files and node.js runtime (if included)
   *
   * @throws IOException
   */
  void deploy(Configuration configuration) throws IOException {
    var bundlePath = configuration.get(SONARLINT_BUNDLE_PATH);
    if (bundlePath.isPresent()) {
      bundle.setDeployLocation(Path.of(bundlePath.get()));
    } else {
      bundle.deploy(temporaryDeployLocation);
    }
    if (
      configuration.get(NODE_EXECUTABLE_PROPERTY).isPresent() ||
      configuration.getBoolean(SKIP_NODE_PROVISIONING_PROPERTY).orElse(false) ||
      configuration.getBoolean(NODE_FORCE_HOST_PROPERTY).orElse(false)
    ) {
      String property;
      if (configuration.get(NODE_EXECUTABLE_PROPERTY).isPresent()) {
        property = NODE_EXECUTABLE_PROPERTY;
      } else if (configuration.get(SKIP_NODE_PROVISIONING_PROPERTY).isPresent()) {
        property = SKIP_NODE_PROVISIONING_PROPERTY;
      } else {
        property = NODE_FORCE_HOST_PROPERTY;
      }
      LOG.info("'{}' is set. Skipping embedded Node.js runtime deployment.", property);
      return;
    }
    embeddedNode.deploy();
  }

  void startServer(BridgeServerConfig serverConfig) throws IOException {
    LOG.debug("Starting server");
    long start = System.currentTimeMillis();
    port = findOpenPort();

    File scriptFile = new File(bundle.startServerScript());
    if (!scriptFile.exists()) {
      throw new NodeCommandException(
        "Node.js script to start the bridge server doesn't exist: " + scriptFile.getAbsolutePath()
      );
    }

    LOG.debug("Creating Node.js process to start the bridge server on port {} ", port);
    nodeCommand = initNodeCommand(serverConfig, scriptFile);
    nodeCommand.start();

    // Create gRPC client and wait for server to be ready
    grpcClient = new BridgeGrpcClient(hostAddress, port, timeoutSeconds);
    if (!grpcClient.waitForReady(timeoutSeconds * 1000L)) {
      status = Status.FAILED;
      throw new NodeCommandException(
        "Failed to start the bridge server (" + timeoutSeconds + "s timeout)"
      );
    } else {
      serverHasStarted();
    }
    long duration = System.currentTimeMillis() - start;
    LOG.debug("Bridge server started on port {} in {} ms", port, duration);

    deprecationWarning.logNodeDeprecation(nodeCommand.getActualNodeVersion());
  }

  boolean waitServerToStart(int timeoutMs) {
    // This method is now only used for existing node process case
    int sleepStep = 100;
    long start = System.currentTimeMillis();
    try {
      Thread.sleep(sleepStep);
      while (!isAlive()) {
        if (System.currentTimeMillis() - start > timeoutMs) {
          return false;
        }
        Thread.sleep(sleepStep);
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
    return true;
  }

  private NodeCommand initNodeCommand(BridgeServerConfig serverConfig, File scriptFile)
    throws IOException {
    var config = serverConfig.config();
    if (serverConfig.product() == SonarProduct.SONARLINT) {
      LOG.info("Running in SonarLint context, metrics will not be computed.");
    }
    var debugMemory = config.getBoolean(DEBUG_MEMORY).orElse(false);
    var nodeTimeout = config.getInt(NODE_TIMEOUT_PROPERTY).orElse(DEFAULT_NODE_SHUTDOWN_TIMEOUT_MS);

    nodeCommandBuilder
      .outputConsumer(new LogOutputConsumer())
      .errorConsumer(LOG::error)
      .embeddedNode(embeddedNode)
      .pathResolver(bundle)
      .minNodeVersion(NodeDeprecationWarning.MIN_SUPPORTED_NODE_VERSION)
      .configuration(serverConfig.config())
      .script(scriptFile.getAbsolutePath())
      .scriptArgs(
        String.valueOf(port),
        hostAddress,
        String.valueOf(debugMemory),
        String.valueOf(nodeTimeout)
      )
      .env(getEnv());

    serverConfig
      .config()
      .getInt(MAX_OLD_SPACE_SIZE_PROPERTY)
      .ifPresent(nodeCommandBuilder::maxOldSpaceSize);

    return nodeCommandBuilder.build();
  }

  private static Map<String, String> getEnv() {
    Map<String, String> env = new HashMap<>();
    if (LOG.isDebugEnabled()) {
      env.put("TIMING", "all");
    }
    // see https://github.com/SonarSource/SonarJS/issues/2803
    env.put("BROWSERSLIST_IGNORE_OLD_DATA", "true");
    return env;
  }

  @Override
  public void startServerLazily(BridgeServerConfig serverConfig) throws IOException {
    if (status == Status.FAILED) {
      if (shouldRestartFailedServer()) {
        // Reset the status, which will cause the server to retry deployment
        status = Status.NOT_STARTED;
      } else {
        // required for SonarLint context to avoid restarting already failed server
        throw new ServerAlreadyFailedException();
      }
    }
    var providedPort = nodeAlreadyRunningPort();
    // if SONARJS_EXISTING_NODE_PROCESS_PORT is set, use existing node process
    if (providedPort != 0) {
      port = providedPort;
      grpcClient = new BridgeGrpcClient(hostAddress, port, timeoutSeconds);
      if (grpcClient.waitForReady(timeoutSeconds * 1000L)) {
        serverHasStarted();
        LOG.info("Using existing Node.js process on port {}", port);
      } else {
        throw new NodeCommandException(
          "Failed to connect to existing Node.js process on port " + port
        );
      }
    }
    workdir = serverConfig.workDirAbsolutePath();
    Files.createDirectories(temporaryDeployLocation.resolve("package"));
    deployedBundles = rulesBundles.deploy(temporaryDeployLocation.resolve("package"));

    try {
      if (isAlive()) {
        LOG.debug("The bridge server is up, no need to start.");
        return;
      } else if (status == Status.STARTED) {
        status = Status.FAILED;
        throw new ServerAlreadyFailedException();
      }
      deploy(serverConfig.config());
      startServer(serverConfig);
    } catch (NodeCommandException e) {
      status = Status.FAILED;
      throw e;
    }
  }

  @Override
  public void initLinter(
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    boolean sonarlint
  ) {
    org.sonar.plugins.javascript.bridge.grpc.InitLinterRequest grpcRequest =
      BridgeRequestConverter.toInitLinterRequest(
        rules,
        environments,
        globals,
        baseDir,
        sonarlint,
        deployedBundles.stream().map(Path::toString).toList(),
        workdir
      );
    org.sonar.plugins.javascript.bridge.grpc.InitLinterResponse response = grpcClient.initLinter(
      grpcRequest
    );
    if (!response.getSuccess()) {
      throw new IllegalStateException("Failed to initialize linter: " + response.getError());
    }
  }

  @Override
  public AnalysisResponse analyzeJsTs(JsAnalysisRequest request) throws IOException {
    try {
      AnalyzeJsTsRequest grpcRequest = BridgeRequestConverter.toAnalyzeJsTsRequest(request);
      AnalyzeJsTsResponse grpcResponse = grpcClient.analyzeJsTs(grpcRequest);
      return BridgeResponseConverter.fromAnalyzeJsTsResponse(grpcResponse);
    } catch (StatusRuntimeException e) {
      throw handleGrpcException(e);
    }
  }

  @Override
  public AnalysisResponse analyzeCss(CssAnalysisRequest request) {
    try {
      AnalyzeCssRequest grpcRequest = BridgeRequestConverter.toAnalyzeCssRequest(request);
      AnalyzeCssResponse grpcResponse = grpcClient.analyzeCss(grpcRequest);
      return BridgeResponseConverter.fromAnalyzeCssResponse(grpcResponse);
    } catch (StatusRuntimeException e) {
      throw handleGrpcException(e);
    }
  }

  @Override
  public AnalysisResponse analyzeYaml(JsAnalysisRequest request) {
    try {
      AnalyzeYamlRequest grpcRequest = BridgeRequestConverter.toAnalyzeYamlRequest(request);
      AnalyzeYamlResponse grpcResponse = grpcClient.analyzeYaml(grpcRequest);
      return BridgeResponseConverter.fromAnalyzeYamlResponse(grpcResponse);
    } catch (StatusRuntimeException e) {
      throw handleGrpcException(e);
    }
  }

  @Override
  public AnalysisResponse analyzeHtml(JsAnalysisRequest request) {
    try {
      AnalyzeHtmlRequest grpcRequest = BridgeRequestConverter.toAnalyzeHtmlRequest(request);
      AnalyzeHtmlResponse grpcResponse = grpcClient.analyzeHtml(grpcRequest);
      return BridgeResponseConverter.fromAnalyzeHtmlResponse(grpcResponse);
    } catch (StatusRuntimeException e) {
      throw handleGrpcException(e);
    }
  }

  private IllegalStateException handleGrpcException(StatusRuntimeException e) {
    if (e.getStatus().getCode() == io.grpc.Status.Code.DEADLINE_EXCEEDED) {
      return new IllegalStateException(TIMEOUT_ERROR_MESSAGE);
    }
    return new IllegalStateException("gRPC call failed: " + e.getMessage(), e);
  }

  @Override
  public void analyzeProject(GrpcProjectAnalysisHandler handler, ProjectAnalysisRequest request) {
    AnalyzeProjectRequest grpcRequest = BridgeRequestConverter.toAnalyzeProjectRequest(
      request,
      deployedBundles.stream().map(Path::toString).toList(),
      workdir
    );
    grpcClient.analyzeProject(grpcRequest, handler);
  }

  public boolean isAlive() {
    if (grpcClient == null && status != BridgeServerImpl.Status.STARTED) {
      return false;
    }
    try {
      var result = grpcClient != null && grpcClient.isHealthy();
      if (result) {
        latestOKIsAliveTimestamp = System.currentTimeMillis();
      }
      return result;
    } catch (Exception e) {
      return false;
    }
  }

  private boolean shouldRestartFailedServer() {
    return (
      latestOKIsAliveTimestamp != null &&
      System.currentTimeMillis() - latestOKIsAliveTimestamp > TIME_AFTER_FAILURE_TO_RESTART_MS
    );
  }

  @Override
  public TelemetryData getTelemetry() {
    if (nodeCommand == null) {
      return new TelemetryData(null);
    }
    return new TelemetryData(
      new RuntimeTelemetry(
        nodeCommand.getActualNodeVersion(),
        nodeCommand.getNodeExecutableOrigin()
      )
    );
  }

  @Override
  public void clean() {
    heartbeatService.shutdownNow();
    if (grpcClient != null) {
      try {
        grpcClient.requestClose();
      } catch (Exception e) {
        LOG.debug("Error requesting bridge shutdown: {}", e.getMessage());
      }
      grpcClient.close();
      grpcClient = null;
    }
    if (nodeCommand != null) {
      nodeCommand.waitFor();
      nodeCommand = null;
    }
    port = 0;
    status = Status.NOT_STARTED;
  }

  /**
   * Required for testing purposes
   */
  void waitFor() {
    nodeCommand.waitFor();
  }

  @Override
  public String getCommandInfo() {
    if (nodeCommand == null) {
      return "Node.js command to start the bridge server was not built yet.";
    } else {
      return "Node.js command to start the bridge server was: " + nodeCommand;
    }
  }

  @Override
  public void start() {
    // Server is started lazily from the org.sonar.plugins.javascript.eslint.EslintBasedRulesSensor
  }

  @Override
  public void stop() {
    clean();
  }

  int nodeAlreadyRunningPort() {
    try {
      int existingNodePort = Optional.ofNullable(getExistingNodeProcessPort())
        .map(Integer::parseInt)
        .orElse(0);
      if (existingNodePort < 0 || existingNodePort > 65535) {
        throw new IllegalStateException(
          "Node.js process port set in $SONARJS_EXISTING_NODE_PROCESS_PORT should be a number between 1 and 65535 range"
        );
      }
      return existingNodePort;
    } catch (NumberFormatException nfe) {
      throw new IllegalStateException(
        "Error parsing number in environment variable SONARJS_EXISTING_NODE_PROCESS_PORT",
        nfe
      );
    }
  }

  public String getExistingNodeProcessPort() {
    return System.getenv(SONARJS_EXISTING_NODE_PROCESS_PORT);
  }

  static class LogOutputConsumer implements Consumer<String> {

    @Override
    public void accept(String message) {
      if (message.startsWith("DEBUG")) {
        LOG.debug(message.substring(5).trim());
      } else if (message.startsWith("WARN")) {
        LOG.warn(message.substring(4).trim());
      } else {
        LOG.info(message);
      }
    }
  }
}
