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
import static org.sonar.plugins.javascript.bridge.NetUtils.findOpenPort;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_FORCE_HOST_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.SKIP_NODE_PROVISIONING_PROPERTY;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
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
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.TempFolder;
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
  public static final String SONARLINT_BUNDLE_PATH = "sonar.js.internal.bundlePath";
  public static final String SONARJS_EXISTING_NODE_PROCESS_PORT =
    "SONARJS_EXISTING_NODE_PROCESS_PORT";
  private static final Gson GSON = new Gson();
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
  private final Http http;
  private Long latestOKIsAliveTimestamp;
  private JSWebSocketClient client;

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
    this(
      nodeCommandBuilder,
      timeoutSeconds,
      bundle,
      rulesBundles,
      deprecationWarning,
      tempFolder,
      embeddedNode,
      Http.getJdkHttpClient()
    );
  }

  public BridgeServerImpl(
    NodeCommandBuilder nodeCommandBuilder,
    int timeoutSeconds,
    Bundle bundle,
    RulesBundles rulesBundles,
    NodeDeprecationWarning deprecationWarning,
    TempFolder tempFolder,
    EmbeddedNode embeddedNode,
    Http http
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
    this.http = http;
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

    if (!waitServerToStart(timeoutSeconds * 1000)) {
      status = Status.FAILED;
      throw new NodeCommandException(
        "Failed to start the bridge server (" + timeoutSeconds + "s timeout)"
      );
    } else {
      serverHasStarted();
    }
    long duration = System.currentTimeMillis() - start;
    LOG.debug("Bridge server started on port {} in {} ms", port, duration);
    establishWebSocketConnection();

    deprecationWarning.logNodeDeprecation(nodeCommand.getActualNodeVersion().major());
  }

  void establishWebSocketConnection() {
    try {
      this.client = new JSWebSocketClient(wsUrl());
      this.client.connectBlocking();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException(e);
    }
  }

  boolean waitServerToStart(int timeoutMs) {
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

    nodeCommandBuilder
      .outputConsumer(new LogOutputConsumer())
      .errorConsumer(LOG::error)
      .embeddedNode(embeddedNode)
      .pathResolver(bundle)
      .minNodeVersion(NodeDeprecationWarning.MIN_SUPPORTED_NODE_VERSION)
      .configuration(serverConfig.config())
      .script(scriptFile.getAbsolutePath())
      .scriptArgs(String.valueOf(port), hostAddress, String.valueOf(debugMemory))
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
  public void startServerLazily(BridgeServerConfig serverConfig)
    throws IOException, InterruptedException {
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
      serverHasStarted();
      LOG.info("Using existing Node.js process on port {}", port);
      establishWebSocketConnection();
    }
    workdir = serverConfig.workDirAbsolutePath();
    Files.createDirectories(temporaryDeployLocation.resolve("package"));
    deployedBundles = rulesBundles.deploy(temporaryDeployLocation.resolve("package"));
    rulesBundles
      .getUcfgRulesBundle()
      .ifPresent(rulesBundle -> PluginInfo.setUcfgPluginVersion(rulesBundle.bundleVersion()));

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
    InitLinterRequest initLinterRequest = new InitLinterRequest(
      rules,
      environments,
      globals,
      baseDir,
      sonarlint,
      deployedBundles.stream().map(Path::toString).toList(),
      workdir
    );
    String request = GSON.toJson(initLinterRequest);

    String response = textResponse(request(request, "init-linter"));
    if (!"OK".equals(response)) {
      throw new IllegalStateException("Failed to initialize linter");
    }
  }

  private static String textResponse(BridgeResponse response) {
    BufferedReader bufferedReader = new BufferedReader(response.reader());
    return bufferedReader.lines().collect(Collectors.joining());
  }

  @Override
  public AnalysisResponse analyzeJsTs(JsAnalysisRequest request) throws IOException {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-jsts"), request.filePath());
  }

  @Override
  public AnalysisResponse analyzeCss(CssAnalysisRequest request) {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-css"), request.filePath());
  }

  @Override
  public AnalysisResponse analyzeYaml(JsAnalysisRequest request) {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-yaml"), request.filePath());
  }

  @Override
  public AnalysisResponse analyzeHtml(JsAnalysisRequest request) {
    var json = GSON.toJson(request);
    return response(request(json, "analyze-html"), request.filePath());
  }

  @Override
  public void analyzeProject(WebSocketMessageHandler handler) {
    this.client.registerHandler(handler);
    var request = (ProjectAnalysisRequest) handler.getRequest();
    request.setBundles(deployedBundles.stream().map(Path::toString).toList());
    request.setRulesWorkdir(workdir);
    this.client.send(GSON.toJson(request));
  }

  private BridgeResponse request(String json, String endpoint) {
    try {
      var response = http.post(json, url(endpoint), timeoutSeconds);
      InputStreamReader reader = new InputStreamReader(
        new ByteArrayInputStream(response.body()),
        StandardCharsets.UTF_8
      );
      return new BridgeServer.BridgeResponse(reader);
    } catch (IOException e) {
      throw new IllegalStateException(
        "The bridge server is unresponsive. It might be because you don't have enough memory, so please go see the troubleshooting section: " +
        "https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/languages/javascript-typescript-css/#slow-or-unresponsive-analysis",
        e
      );
    }
  }

  private static AnalysisResponse response(BridgeResponse result, String filePath) {
    try {
      return AnalysisResponse.fromDTO(GSON.fromJson(result.reader(), AnalysisResponseDTO.class));
    } catch (JsonSyntaxException e) {
      String msg =
        "Failed to parse response for file " + filePath + ": \n-----\n" + result + "\n-----\n";
      LOG.error(msg, e);
      throw new IllegalStateException("Failed to parse response", e);
    }
  }

  public boolean isAlive() {
    if (nodeCommand == null && status != Status.STARTED) {
      return false;
    }
    try {
      String res = http.get(url("status"));
      var result = "OK".equals(res);
      if (result) {
        latestOKIsAliveTimestamp = System.currentTimeMillis();
      }
      return result;
    } catch (IOException e) {
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
  public boolean newTsConfig() {
    var response = textResponse(request("", "new-tsconfig"));
    return "OK".equals(response);
  }

  TsConfigResponse tsConfigFiles(String tsconfigAbsolutePath) {
    String result = null;
    try {
      TsConfigRequest tsConfigRequest = new TsConfigRequest(tsconfigAbsolutePath);
      result = textResponse(request(GSON.toJson(tsConfigRequest), "tsconfig-files"));
      return GSON.fromJson(result, TsConfigResponse.class);
    } catch (JsonSyntaxException e) {
      LOG.error(
        "Failed to parse response when requesting files for tsconfig: {}: \n-----\n{}\n-----\n{}",
        tsconfigAbsolutePath,
        result,
        e.getMessage()
      );
    }
    return new TsConfigResponse(emptyList(), emptyList(), result, null);
  }

  @Override
  public TsConfigFile loadTsConfig(String filename) {
    var tsConfigResponse = tsConfigFiles(filename);
    if (tsConfigResponse.error != null) {
      LOG.error(tsConfigResponse.error);
    }
    LOG.debug("tsconfig {} files {}", filename, tsConfigResponse.files);
    return new TsConfigFile(
      filename,
      emptyListIfNull(tsConfigResponse.files),
      emptyListIfNull(tsConfigResponse.projectReferences)
    );
  }

  @Override
  public TsProgram createProgram(TsProgramRequest tsProgramRequest) {
    var response = request(GSON.toJson(tsProgramRequest), "create-program");
    return GSON.fromJson(textResponse(response), TsProgram.class);
  }

  @Override
  public boolean deleteProgram(TsProgram tsProgram) {
    var programToDelete = new TsProgram(tsProgram.programId(), null, null);
    var response = textResponse(request(GSON.toJson(programToDelete), "delete-program"));
    return "OK".equals(response);
  }

  @Override
  public TsConfigFile createTsConfigFile(String content) {
    var response = request(content, "create-tsconfig-file");
    return GSON.fromJson(textResponse(response), TsConfigFile.class);
  }

  @Override
  public TelemetryData getTelemetry() {
    if (nodeCommand == null) {
      return new TelemetryData(getTelemetryEslintBridgeResponse().dependencies(), null);
    }
    return new TelemetryData(
      getTelemetryEslintBridgeResponse().dependencies(),
      new RuntimeTelemetry(
        nodeCommand.getActualNodeVersion(),
        nodeCommand.getNodeExecutableOrigin()
      )
    );
  }

  private TelemetryEslintBridgeResponse getTelemetryEslintBridgeResponse() {
    try {
      var result = http.get(url("get-telemetry"));
      return GSON.fromJson(result, TelemetryEslintBridgeResponse.class);
    } catch (IOException e) {
      return new TelemetryEslintBridgeResponse(List.of());
    }
  }

  private static <T> List<T> emptyListIfNull(@Nullable List<T> list) {
    return list == null ? emptyList() : list;
  }

  @Override
  public void clean() {
    heartbeatService.shutdownNow();
    if (nodeCommand != null && isAlive()) {
      request("", "close");
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

  private URI wsUrl() {
    try {
      return new URI("ws", null, hostAddress, port, "/ws", null, null);
    } catch (URISyntaxException e) {
      throw new IllegalStateException("Invalid URI: " + e.getMessage(), e);
    }
  }

  private URI url(String endpoint) {
    try {
      return new URI("http", null, hostAddress, port, "/" + endpoint, null, null);
    } catch (URISyntaxException e) {
      throw new IllegalStateException("Invalid URI: " + e.getMessage(), e);
    }
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

  static class TsConfigRequest {

    final String tsConfig;

    TsConfigRequest(String tsconfig) {
      this.tsConfig = tsconfig;
    }
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
