/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import static java.util.Collections.emptyList;
import static org.sonar.plugins.javascript.bridge.NetUtils.findOpenPort;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.file.Path;
import java.time.Duration;
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
import org.sonar.api.batch.sensor.SensorContext;
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
  // internal property to set "--max-old-space-size" for Node process running this server
  private static final String MAX_OLD_SPACE_SIZE_PROPERTY = "sonar.javascript.node.maxspace";
  private static final String ALLOW_TS_PARSER_JS_FILES = "sonar.javascript.allowTsParserJsFiles";
  private static final String DEBUG_MEMORY = "sonar.javascript.node.debugMemory";
  public static final String SONARJS_EXISTING_NODE_PROCESS_PORT =
    "SONARJS_EXISTING_NODE_PROCESS_PORT";
  private static final Gson GSON = new Gson();
  private static final String BRIDGE_DEPLOY_LOCATION = "bridge-bundle";

  private final HttpClient client;
  private final NodeCommandBuilder nodeCommandBuilder;
  private final int timeoutSeconds;
  private final Bundle bundle;
  private final String hostAddress;
  private int port;
  private NodeCommand nodeCommand;
  private Status status = Status.NOT_STARTED;
  private final RulesBundles rulesBundles;
  private final NodeDeprecationWarning deprecationWarning;
  private final Path temporaryDeployLocation;
  private final EmbeddedNode embeddedNode;
  private static final int HEARTBEAT_INTERVAL_SECONDS = 5;
  private final ScheduledExecutorService heartbeatService;
  private ScheduledFuture<?> heartbeatFuture;

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
    this.client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(timeoutSeconds)).build();
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
      heartbeatFuture =
        heartbeatService.scheduleAtFixedRate(
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
    bundle.deploy(temporaryDeployLocation);
    if (configuration.get(NODE_EXECUTABLE_PROPERTY).isPresent()) {
      LOG.info(
        "'{}' is set. Skipping embedded Node.js runtime deployment.",
        NODE_EXECUTABLE_PROPERTY
      );
      return;
    }
    embeddedNode.deploy();
  }

  void startServer(SensorContext context, List<Path> deployedBundles) throws IOException {
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
    String bundles = deployedBundles
      .stream()
      .map(Path::toString)
      .collect(Collectors.joining(File.pathSeparator));
    nodeCommand = initNodeCommand(context, scriptFile, bundles);
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
    deprecationWarning.logNodeDeprecation(nodeCommand.getActualNodeVersion().major());
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

  private NodeCommand initNodeCommand(SensorContext context, File scriptFile, String bundles)
    throws IOException {
    var workdir = context.fileSystem().workDir().getAbsolutePath();
    var config = context.config();
    var allowTsParserJsFiles = config.getBoolean(ALLOW_TS_PARSER_JS_FILES).orElse(true);
    var isSonarLint = context.runtime().getProduct() == SonarProduct.SONARLINT;
    if (isSonarLint) {
      LOG.info("Running in SonarLint context, metrics will not be computed.");
    }
    var debugMemory = config.getBoolean(DEBUG_MEMORY).orElse(false);

    nodeCommandBuilder
      .outputConsumer(new LogOutputConsumer())
      .errorConsumer(LOG::error)
      .embeddedNode(embeddedNode)
      .pathResolver(bundle)
      .minNodeVersion(NodeDeprecationWarning.MIN_SUPPORTED_NODE_VERSION)
      .configuration(context.config())
      .script(scriptFile.getAbsolutePath())
      .scriptArgs(
        String.valueOf(port),
        hostAddress,
        workdir,
        String.valueOf(allowTsParserJsFiles),
        String.valueOf(isSonarLint),
        String.valueOf(debugMemory),
        bundles
      )
      .env(getEnv());

    context
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
  public void startServerLazily(SensorContext context) throws IOException {
    if (status == Status.FAILED) {
      // required for SonarLint context to avoid restarting already failed server
      throw new ServerAlreadyFailedException();
    }
    var providedPort = nodeAlreadyRunningPort();
    // if SONARJS_EXISTING_NODE_PROCESS_PORT is set, use existing node process
    if (providedPort != 0) {
      port = providedPort;
      serverHasStarted();
      LOG.info("Using existing Node.js process on port {}", port);
    }

    try {
      if (isAlive()) {
        LOG.debug("The bridge server is up, no need to start.");
        return;
      } else if (status == Status.STARTED) {
        status = Status.FAILED;
        throw new ServerAlreadyFailedException();
      }
      deploy(context.config());
      List<Path> deployedBundles = rulesBundles.deploy(temporaryDeployLocation.resolve("package"));
      rulesBundles
        .getUcfgRulesBundle()
        .ifPresent(rulesBundle -> PluginInfo.setUcfgPluginVersion(rulesBundle.bundleVersion()));
      startServer(context, deployedBundles);
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
    AnalysisMode analysisMode,
    String baseDir,
    List<String> exclusions
  ) throws IOException {
    initLinter(AnalysisMode.DEFAULT_LINTER_ID, rules, environments, globals, baseDir, exclusions);

    if (analysisMode == AnalysisMode.SKIP_UNCHANGED) {
      initLinter(
        AnalysisMode.UNCHANGED_LINTER_ID,
        AnalysisMode.getUnchangedFileRules(rules),
        environments,
        globals,
        baseDir,
        exclusions
      );
    }
  }

  private void initLinter(
    String linterId,
    List<EslintRule> rules,
    List<String> environments,
    List<String> globals,
    String baseDir,
    List<String> exclusions
  ) throws IOException {
    InitLinterRequest initLinterRequest = new InitLinterRequest(
      linterId,
      rules,
      environments,
      globals,
      baseDir,
      exclusions
    );
    String request = GSON.toJson(initLinterRequest);

    String response = request(request, "init-linter");
    if (!"OK!".equals(response)) {
      throw new IllegalStateException("Failed to initialize linter");
    }
  }

  @Override
  public AnalysisResponse analyzeJavaScript(JsAnalysisRequest request) throws IOException {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-js", true), request.filePath());
  }

  @Override
  public AnalysisResponse analyzeTypeScript(JsAnalysisRequest request) throws IOException {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-ts", true), request.filePath());
  }

  @Override
  public AnalysisResponse analyzeCss(CssAnalysisRequest request) throws IOException {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-css"), request.filePath());
  }

  @Override
  public AnalysisResponse analyzeYaml(JsAnalysisRequest request) throws IOException {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-yaml"), request.filePath());
  }

  @Override
  public AnalysisResponse analyzeHtml(JsAnalysisRequest request) throws IOException {
    var json = GSON.toJson(request);
    return response(request(json, "analyze-html"), request.filePath());
  }

  private String request(String json, String endpoint) throws IOException {
    return request(json, endpoint, false);
  }
  private String request(String json, String endpoint, boolean isFormData) throws IOException {
    var request = HttpRequest
      .newBuilder()
      .uri(url(endpoint))
      .timeout(Duration.ofSeconds(timeoutSeconds))
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(json))
      .build();

    try {
      var response = client.send(request, BodyHandlers.ofString());

      if (isFormData) {
        String boundary = "--" + response.headers().firstValue("Content-Type")
            .orElseThrow(() -> new IllegalStateException("No Content-Type header"))
            .split("boundary=")[1];
        String[] parts = response.body().split(boundary);
        // Process each part
        for (String part : parts) {
          // Split the part into headers and body
          String[] splitPart = part.split("\r\n\r\n", 2);
          if (splitPart.length < 2)
            continue; // Skip if there's no body

          String headers = splitPart[0];
          String partBody = splitPart[1];

          if (headers.contains("json")) {
            return partBody;
          }

          // Process the part body...
        }
      }

      // response.
      return response.body();
    } catch (InterruptedException e) {
      throw handleInterruptedException(e, "Request " + endpoint + " was interrupted.");
    } catch (IOException e) {
      throw new IllegalStateException("The bridge server is unresponsive", e);
    }
  }

  private static IllegalStateException handleInterruptedException(
    InterruptedException e,
    String msg
  ) {
    LOG.error(msg, e);
    Thread.currentThread().interrupt();
    return new IllegalStateException(msg, e);
  }

  private static AnalysisResponse response(String result, String filePath) {
    try {
      return GSON.fromJson(result, AnalysisResponse.class);
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
    var request = HttpRequest.newBuilder(url("status")).GET().build();
    try {
      var response = client.send(request, BodyHandlers.ofString());
      String body = response.body();
      return "OK!".equals(body);
    } catch (InterruptedException e) {
      throw handleInterruptedException(e, "isAlive was interrupted");
    } catch (IOException e) {
      return false;
    }
  }

  @Override
  public boolean newTsConfig() {
    try {
      var response = request("", "new-tsconfig");
      return "OK!".equals(response);
    } catch (IOException e) {
      LOG.error("Failed to post new-tsconfig", e);
    }
    return false;
  }

  TsConfigResponse tsConfigFiles(String tsconfigAbsolutePath) {
    String result = null;
    try {
      TsConfigRequest tsConfigRequest = new TsConfigRequest(tsconfigAbsolutePath);
      result = request(GSON.toJson(tsConfigRequest), "tsconfig-files");
      return GSON.fromJson(result, TsConfigResponse.class);
    } catch (IOException e) {
      LOG.error("Failed to request files for tsconfig: " + tsconfigAbsolutePath, e);
    } catch (JsonSyntaxException e) {
      LOG.error(
        "Failed to parse response when requesting files for tsconfig: {}: \n-----\n{}\n-----\n{}", tsconfigAbsolutePath, result, e.getMessage()
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
  public TsProgram createProgram(TsProgramRequest tsProgramRequest) throws IOException {
    var response = request(GSON.toJson(tsProgramRequest), "create-program");
    return GSON.fromJson(response, TsProgram.class);
  }

  @Override
  public boolean deleteProgram(TsProgram tsProgram) throws IOException {
    var programToDelete = new TsProgram(tsProgram.programId(), null, null);
    var response = request(GSON.toJson(programToDelete), "delete-program");
    return "OK!".equals(response);
  }

  @Override
  public TsConfigFile createTsConfigFile(String content) throws IOException {
    var response = request(content, "create-tsconfig-file");
    return GSON.fromJson(response, TsConfigFile.class);
  }

  private static <T> List<T> emptyListIfNull(@Nullable List<T> list) {
    return list == null ? emptyList() : list;
  }

  @Override
  public void clean() {
    LOG.trace("Closing heartbeat service");
    heartbeatService.shutdownNow();
    if (nodeCommand != null && isAlive()) {
      try {
        request("", "close");
      } catch (IOException e) {
        LOG.warn("Failed to close the bridge server", e);
      }
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

  private URI url(String endpoint) {
    try {
      return new URI("http", null, hostAddress, port, "/" + endpoint, null, null);
    } catch (URISyntaxException e) {
      throw new IllegalStateException("Invalid URI: " + e.getMessage(), e);
    }
  }

  int nodeAlreadyRunningPort() {
    try {
      int existingNodePort = Optional
        .ofNullable(getExistingNodeProcessPort())
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

    final String tsconfig;

    TsConfigRequest(String tsconfig) {
      this.tsconfig = tsconfig;
    }
  }

  static class InitLinterRequest {

    String linterId;
    List<EslintRule> rules;
    List<String> environments;
    List<String> globals;
    String baseDir;
    List<String> exclusions;

    InitLinterRequest(
      String linterId,
      List<EslintRule> rules,
      List<String> environments,
      List<String> globals,
      String baseDir,
      List<String> exclusions
    ) {
      this.linterId = linterId;
      this.rules = rules;
      this.environments = environments;
      this.globals = globals;
      this.baseDir = baseDir;
      this.exclusions = exclusions;
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
