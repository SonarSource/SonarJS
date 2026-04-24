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

import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_FORCE_HOST_PROPERTY;
import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.SKIP_NODE_PROVISIONING_PROPERTY;

import io.grpc.ConnectivityState;
import io.grpc.Context;
import io.grpc.ManagedChannel;
import io.grpc.Status.Code;
import io.grpc.StatusRuntimeException;
import io.grpc.okhttp.OkHttpChannelBuilder;
import io.grpc.stub.StreamObserver;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletionException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.SonarProduct;
import org.sonar.api.config.Configuration;
import org.sonar.api.utils.TempFolder;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectServiceGrpc;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectStreamResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectUnaryResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.LeaseRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.LeaseResponse;
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
  private static final int MAX_INBOUND_GRPC_MESSAGE_SIZE = Integer.MAX_VALUE;
  private static final int STREAM_CANCELLATION_POLL_INTERVAL_MS = 100;
  // internal property to set "--max-old-space-size" for Node process running this server
  private static final String MAX_OLD_SPACE_SIZE_PROPERTY = "sonar.javascript.node.maxspace";
  private static final String DEBUG_MEMORY = "sonar.javascript.node.debugMemory";
  public static final String SONARLINT_BUNDLE_PATH = "sonar.js.internal.bundlePath";
  /**
   * The default timeout to shut down the Node.js runtime if Java does not acquire the lease after
   * startup.
   */
  public static final int DEFAULT_NODE_SHUTDOWN_TIMEOUT_MS = 15_000;
  public static final String NODE_TIMEOUT_PROPERTY = "sonar.javascript.node.timeout";
  public static final String SONARJS_EXISTING_NODE_PROCESS_PORT =
    "SONARJS_EXISTING_NODE_PROCESS_PORT";
  private static final String STARTUP_PORT_LOG_PREFIX = "gRPC analyze-project server listening on ";
  private static final int STARTUP_PORT_WAIT_POLL_INTERVAL_MS = 100;
  private static final String ANALYSIS_CANCELLED_MESSAGE =
    "Analysis interrupted because the SensorContext is in cancelled state";
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
  private Long latestOKIsAliveTimestamp;
  private ManagedChannel channel;
  private StreamObserver<LeaseRequest> leaseObserver;
  private volatile boolean leaseTerminated;
  /**
   * Lease ownership only applies to the analyzer runtime that this JVM starts via {@code server.mjs}.
   * Externally managed runtimes (for example debug sessions attached through
   * SONARJS_EXISTING_NODE_PROCESS_PORT) must not be governed by the lease.
   */
  private boolean ownsNodeProcess;

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

  public BridgeServerImpl(
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
    this.embeddedNode = embeddedNode;
  }

  void serverHasStarted() {
    status = Status.STARTED;
    latestOKIsAliveTimestamp = System.currentTimeMillis();
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
    long deadlineNanos = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
    port = 0;

    File scriptFile = new File(bundle.startServerScript());
    if (!scriptFile.exists()) {
      throw new NodeCommandException(
        "Node.js script to start the bridge server doesn't exist: " + scriptFile.getAbsolutePath()
      );
    }

    var startupPort = new AtomicInteger();
    var startupPortReady = new CountDownLatch(1);
    LOG.debug("Creating Node.js process to start the bridge server on port {} ", port);
    nodeCommand = initNodeCommand(
      serverConfig,
      scriptFile,
      new StartupLogOutputConsumer(new LogOutputConsumer(), startupPort, startupPortReady)
    );
    nodeCommand.start();
    ownsNodeProcess = true;
    try {
      if (!waitForBoundPort(startupPort, startupPortReady, remainingTimeoutMs(deadlineNanos))) {
        throw new NodeCommandException(
          "Failed to start the bridge server (" + timeoutSeconds + "s timeout)"
        );
      }
      openChannel();
      if (!waitServerToStart(remainingTimeoutMs(deadlineNanos))) {
        throw new NodeCommandException(
          "Failed to start the bridge server (" + timeoutSeconds + "s timeout)"
        );
      }
      serverHasStarted();
    } catch (RuntimeException e) {
      handleStartupFailure();
      throw e;
    }
    long duration = System.currentTimeMillis() - start;
    LOG.debug("Bridge server started on port {} in {} ms", port, duration);

    deprecationWarning.logNodeDeprecation(nodeCommand.getActualNodeVersion());
  }

  boolean waitServerToStart(int timeoutMs) {
    if (!waitChannelReady(timeoutMs)) {
      return false;
    }
    if (ownsNodeProcess) {
      if (nodeCommand != null && !nodeCommand.isAlive()) {
        LOG.debug("The Node.js process exited before the analyze-project lease was acquired.");
        return false;
      }
      startLease();
      return !leaseTerminated;
    }
    latestOKIsAliveTimestamp = System.currentTimeMillis();
    return true;
  }

  boolean waitChannelReady(int timeoutMs) {
    if (channel == null) {
      return false;
    }
    long deadlineNanos = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
    ConnectivityState state = channel.getState(true);
    try {
      while (state != ConnectivityState.READY) {
        if (state == ConnectivityState.SHUTDOWN) {
          return false;
        }
        long remainingNanos = deadlineNanos - System.nanoTime();
        if (remainingNanos <= 0) {
          return false;
        }
        CountDownLatch latch = new CountDownLatch(1);
        channel.notifyWhenStateChanged(state, latch::countDown);
        boolean stateChanged = latch.await(
          Math.min(TimeUnit.NANOSECONDS.toMillis(remainingNanos), 100),
          TimeUnit.MILLISECONDS
        );
        if (stateChanged) {
          state = channel.getState(false);
        }
      }
      latestOKIsAliveTimestamp = System.currentTimeMillis();
      return true;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return false;
    }
  }

  private NodeCommand initNodeCommand(
    BridgeServerConfig serverConfig,
    File scriptFile,
    Consumer<String> outputConsumer
  ) throws IOException {
    var config = serverConfig.config();
    if (serverConfig.product() == SonarProduct.SONARLINT) {
      LOG.info("Running in SonarLint context, metrics will not be computed.");
    }
    var debugMemory = config.getBoolean(DEBUG_MEMORY).orElse(false);
    var nodeTimeout = config.getInt(NODE_TIMEOUT_PROPERTY).orElse(DEFAULT_NODE_SHUTDOWN_TIMEOUT_MS);

    nodeCommandBuilder
      .outputConsumer(outputConsumer)
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

  private boolean waitForBoundPort(
    AtomicInteger startupPort,
    CountDownLatch startupPortReady,
    int timeoutMs
  ) {
    long deadlineNanos = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
    try {
      while (startupPort.get() == 0) {
        if (nodeCommand != null && !nodeCommand.isAlive()) {
          return false;
        }
        long remainingNanos = deadlineNanos - System.nanoTime();
        if (remainingNanos <= 0) {
          return false;
        }
        startupPortReady.await(
          Math.min(
            TimeUnit.NANOSECONDS.toMillis(remainingNanos),
            STARTUP_PORT_WAIT_POLL_INTERVAL_MS
          ),
          TimeUnit.MILLISECONDS
        );
      }
      port = startupPort.get();
      return true;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return false;
    }
  }

  private static int remainingTimeoutMs(long deadlineNanos) {
    return (int) Math.max(0, TimeUnit.NANOSECONDS.toMillis(deadlineNanos - System.nanoTime()));
  }

  @Nullable
  static Integer extractStartupPort(String message) {
    if (!message.startsWith(STARTUP_PORT_LOG_PREFIX)) {
      return null;
    }

    // The Node startup log has a fixed format; parsing the trailing port keeps IPv6 support
    // without relying on a broad regular expression over arbitrary process output.
    int separatorIndex = message.lastIndexOf(':');
    if (
      separatorIndex < STARTUP_PORT_LOG_PREFIX.length() || separatorIndex == message.length() - 1
    ) {
      return null;
    }

    try {
      return Integer.parseInt(message.substring(separatorIndex + 1));
    } catch (NumberFormatException e) {
      return null;
    }
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
      ownsNodeProcess = false;
      port = providedPort;
      openChannel();
      if (!waitChannelReady(timeoutSeconds * 1000)) {
        status = Status.FAILED;
        closeChannel();
        throw new ServerAlreadyFailedException();
      }
      serverHasStarted();
      LOG.info("Using existing Node.js process on port {}", port);
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
  public void analyzeProject(ProjectAnalysisHandler handler) {
    var grpcRequest = enrichAnalyzeProjectRequest(handler.getRequest());
    var analyzeContext = Context.current().withCancellation();
    var finished = new AtomicBoolean(false);
    var cancellationWatcher = startStreamCancellationWatcher(handler, analyzeContext, finished);
    Iterator<AnalyzeProjectStreamResponse> responses;
    var previousContext = analyzeContext.attach();
    try {
      responses = blockingAnalyzeProjectStub().analyzeProject(grpcRequest);
    } catch (StatusRuntimeException e) {
      finished.set(true);
      cancellationWatcher.interrupt();
      analyzeContext.cancel(null);
      throw analyzeProjectException(e);
    } finally {
      analyzeContext.detach(previousContext);
    }

    try {
      while (responses.hasNext()) {
        handler.handleMessage(responses.next());
        if (handler.getContext().isCancelled()) {
          analyzeContext.cancel(new CancellationException(ANALYSIS_CANCELLED_MESSAGE));
          throw cancelledStreamException();
        }
      }
    } catch (StatusRuntimeException e) {
      if (handler.getContext().isCancelled() && e.getStatus().getCode() == Code.CANCELLED) {
        throw cancelledStreamException();
      }
      throw analyzeProjectException(e);
    } finally {
      finished.set(true);
      cancellationWatcher.interrupt();
      analyzeContext.cancel(null);
    }
    ensureProjectAnalysisCompleted(handler);
  }

  /**
   * Used by the standalone parser path, which needs a fully materialized response for a single
   * request instead of consuming the project-analysis stream incrementally.
   */
  @Override
  public AnalyzeProjectUnaryResponse analyzeProject(AnalyzeProjectRequest request)
    throws IOException {
    var grpcRequest = enrichAnalyzeProjectRequest(request);
    try {
      return blockingAnalyzeProjectUnaryStub().analyzeProjectUnary(grpcRequest);
    } catch (StatusRuntimeException e) {
      throw analyzeProjectException(e);
    }
  }

  private AnalyzeProjectRequest enrichAnalyzeProjectRequest(AnalyzeProjectRequest request) {
    var builder = request
      .toBuilder()
      .addAllBundles(deployedBundles.stream().map(Path::toString).toList());
    if (workdir != null) {
      builder.setRulesWorkdir(workdir);
    }
    return builder.build();
  }

  private static IllegalStateException unresponsiveServerException(Exception e) {
    return new IllegalStateException(
      "The bridge server is unresponsive. It might be because you don't have enough memory, so please go see the troubleshooting section: " +
        "https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/languages/javascript-typescript-css/#slow-or-unresponsive-analysis",
      e
    );
  }

  private static IllegalStateException analyzeProjectException(StatusRuntimeException e) {
    return switch (e.getStatus().getCode()) {
      case INVALID_ARGUMENT, INTERNAL, RESOURCE_EXHAUSTED -> new IllegalStateException(
        runtimeErrorMessage(e),
        e
      );
      default -> unresponsiveServerException(e);
    };
  }

  private static String runtimeErrorMessage(StatusRuntimeException e) {
    var description = e.getStatus().getDescription();
    if (description == null || description.isBlank()) {
      return "Received error from analyzer runtime";
    }
    return "Received error from analyzer runtime: " + description;
  }

  private static void ensureProjectAnalysisCompleted(ProjectAnalysisHandler handler) {
    var future = handler.getFuture();
    if (!future.isDone()) {
      throw new IllegalStateException(
        "Analyzer runtime completed the project-analysis stream without sending project metadata"
      );
    }
    future.join();
  }

  private static CompletionException cancelledStreamException() {
    return new CompletionException(new CancellationException(ANALYSIS_CANCELLED_MESSAGE));
  }

  private static Thread startStreamCancellationWatcher(
    ProjectAnalysisHandler handler,
    Context.CancellableContext analyzeContext,
    AtomicBoolean finished
  ) {
    Thread watcher = new Thread(() -> {
      while (!finished.get()) {
        if (handler.getContext().isCancelled()) {
          analyzeContext.cancel(new CancellationException(ANALYSIS_CANCELLED_MESSAGE));
          return;
        }
        try {
          Thread.sleep(STREAM_CANCELLATION_POLL_INTERVAL_MS);
        } catch (InterruptedException e) {
          Thread.currentThread().interrupt();
          return;
        }
      }
    });
    watcher.setName("bridge-analyze-project-cancel");
    watcher.setDaemon(true);
    watcher.start();
    return watcher;
  }

  public boolean isAlive() {
    if (status != Status.STARTED || channel == null || channel.isShutdown()) {
      return false;
    }
    var state = channel.getState(false);
    var result =
      (state == ConnectivityState.READY) &&
      (!ownsNodeProcess || (leaseObserver != null && !leaseTerminated));
    if (result) {
      latestOKIsAliveTimestamp = System.currentTimeMillis();
    }
    return result;
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
    closeLease();
    closeChannel();
    if (nodeCommand != null) {
      stopNodeCommand(false);
    }
    port = 0;
    status = Status.NOT_STARTED;
    ownsNodeProcess = false;
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

  private void handleStartupFailure() {
    status = Status.FAILED;
    closeChannel();
    stopNodeCommand(true);
    ownsNodeProcess = false;
  }

  private void openChannel() {
    if (channel != null && !channel.isShutdown()) {
      return;
    }
    // OkHttp keeps the transport classloading simple inside SonarQube/SonarLint plugin
    // classloaders and avoids the lazy shaded-Netty helper loading that broke Windows QA.
    channel = OkHttpChannelBuilder.forAddress(hostAddress, port)
      .usePlaintext()
      .maxInboundMessageSize(MAX_INBOUND_GRPC_MESSAGE_SIZE)
      .build();
  }

  private void closeChannel() {
    if (channel == null) {
      return;
    }
    try {
      channel.shutdownNow();
      channel.awaitTermination(1, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    } finally {
      channel = null;
      leaseObserver = null;
      leaseTerminated = true;
    }
  }

  private synchronized void startLease() {
    if (!ownsNodeProcess || channel == null || leaseObserver != null) {
      return;
    }
    leaseTerminated = false;
    leaseObserver = asyncAnalyzeProjectStub().lease(
      new StreamObserver<>() {
        @Override
        public void onNext(LeaseResponse response) {
          // no-op, the lease only exists to tie the child lifecycle to the Java process
        }

        @Override
        public void onError(Throwable throwable) {
          onLeaseTerminated(throwable);
        }

        @Override
        public void onCompleted() {
          onLeaseTerminated(null);
        }
      }
    );
  }

  private synchronized void closeLease() {
    if (leaseObserver == null) {
      leaseTerminated = true;
      return;
    }
    var currentLeaseObserver = leaseObserver;
    leaseObserver = null;
    leaseTerminated = true;
    try {
      currentLeaseObserver.onCompleted();
    } catch (RuntimeException e) {
      LOG.debug("Failed to complete analyze-project lease", e);
    }
  }

  private synchronized void onLeaseTerminated(@Nullable Throwable throwable) {
    if (leaseObserver == null && leaseTerminated) {
      return;
    }
    leaseObserver = null;
    leaseTerminated = true;
    if (channel != null && !channel.isShutdown() && throwable != null) {
      LOG.debug("Analyze-project lease terminated unexpectedly", throwable);
    }
  }

  private void stopNodeCommand(boolean destroyForcibly) {
    if (nodeCommand == null) {
      return;
    }
    if (destroyForcibly) {
      nodeCommand.destroy();
    }
    nodeCommand.waitFor();
    nodeCommand = null;
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

  /**
   * Returns the blocking stub used for the main project-analysis RPC.
   *
   * <p>{@code AnalyzeProject} is a server-streaming call: Java sends one request, then consumes a
   * stream of incremental file results plus the final metadata message. This is the transport used
   * by {@link #analyzeProject(ProjectAnalysisHandler)}.
   */
  private AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub blockingAnalyzeProjectStub() {
    return AnalyzeProjectServiceGrpc.newBlockingStub(channel);
  }

  /**
   * Returns the blocking stub used for the unary project-analysis RPC.
   *
   * <p>In gRPC, "unary" means one request and one response, as opposed to a streaming response.
   * This path is used by {@link #analyzeProject(AnalyzeProjectRequest)}, which backs the standalone
   * parser and expects the whole result in a single payload. A deadline is applied here because
   * this tooling-oriented request should complete quickly.
   */
  private AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub blockingAnalyzeProjectUnaryStub() {
    var stub = blockingAnalyzeProjectStub();
    return timeoutSeconds > 0 ? stub.withDeadlineAfter(timeoutSeconds, TimeUnit.SECONDS) : stub;
  }

  /**
   * Returns the async stub used for the long-lived bidirectional lease stream.
   *
   * <p>The lease is not part of file analysis itself; it is used to tie the lifecycle of the
   * child Node.js runtime to the Java owner without blocking the calling thread.
   */
  private AnalyzeProjectServiceGrpc.AnalyzeProjectServiceStub asyncAnalyzeProjectStub() {
    return AnalyzeProjectServiceGrpc.newStub(channel);
  }

  public String getExistingNodeProcessPort() {
    return System.getenv(SONARJS_EXISTING_NODE_PROCESS_PORT);
  }

  static class LogOutputConsumer implements Consumer<String> {

    @Override
    public void accept(String message) {
      if (message.startsWith("DEBUG")) {
        if (LOG.isDebugEnabled()) {
          LOG.debug(message.substring(5).trim());
        }
      } else if (message.startsWith("WARN")) {
        if (LOG.isWarnEnabled()) {
          LOG.warn(message.substring(4).trim());
        }
      } else {
        LOG.info(message);
      }
    }
  }

  private static class StartupLogOutputConsumer implements Consumer<String> {

    private final Consumer<String> delegate;
    private final AtomicInteger startupPort;
    private final CountDownLatch startupPortReady;

    private StartupLogOutputConsumer(
      Consumer<String> delegate,
      AtomicInteger startupPort,
      CountDownLatch startupPortReady
    ) {
      this.delegate = delegate;
      this.startupPort = startupPort;
      this.startupPortReady = startupPortReady;
    }

    @Override
    public void accept(String message) {
      delegate.accept(message);
      var parsedStartupPort = extractStartupPort(message);
      if (parsedStartupPort != null) {
        startupPort.compareAndSet(0, parsedStartupPort);
        startupPortReady.countDown();
      }
    }
  }
}
