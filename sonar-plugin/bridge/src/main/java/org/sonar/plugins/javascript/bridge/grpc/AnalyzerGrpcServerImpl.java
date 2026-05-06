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
package org.sonar.plugins.javascript.bridge.grpc;

import io.grpc.ConnectivityState;
import io.grpc.LoadBalancerRegistry;
import io.grpc.ManagedChannel;
import io.grpc.internal.PickFirstLoadBalancerProvider;
import io.grpc.okhttp.OkHttpChannelBuilder;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectServiceGrpc;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectStreamResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileResultMessage;
import org.sonar.plugins.javascript.analyzeproject.grpc.Issue;
import org.sonar.plugins.javascript.bridge.NetUtils;

@ScannerSide
public class AnalyzerGrpcServerImpl implements AnalyzerGrpcServer {

  private static final Logger LOG = LoggerFactory.getLogger(AnalyzerGrpcServerImpl.class);
  private static final int STARTUP_TIMEOUT_MS = 10_000;
  private static final int STARTUP_POLL_INTERVAL_MS = 200;
  private static final int MAX_INBOUND_GRPC_MESSAGE_SIZE = Integer.MAX_VALUE;
  private static final AtomicBoolean PICK_FIRST_REGISTERED = new AtomicBoolean();

  private final Path binaryPath;
  private Process process;
  private ManagedChannel channel;
  private AnalyzeProjectServiceGrpc.AnalyzeProjectServiceBlockingStub blockingStub;
  private int port;

  public AnalyzerGrpcServerImpl(Path binaryPath) {
    this.binaryPath = binaryPath;
  }

  @Override
  public void start() throws IOException {
    try {
      port = NetUtils.findOpenPort();
      LOG.info("Starting jsts-go gRPC server on port {}", port);

      ProcessBuilder pb = new ProcessBuilder(binaryPath.toString(), "--port", String.valueOf(port));
      pb.redirectErrorStream(false);
      process = pb.start();

      // The Go runtime logs on stderr by default, so mirror that into the scanner logs.
      var stderr = new BufferedReader(new InputStreamReader(process.getErrorStream()));
      Thread stderrThread = new Thread(
        () -> {
          try {
            String line;
            while ((line = stderr.readLine()) != null) {
              LOG.info("[jsts-go] {}", line);
            }
          } catch (IOException e) {
            LOG.debug("jsts-go stderr reader stopped", e);
          }
        },
        "jsts-go-stderr"
      );
      stderrThread.setDaemon(true);
      stderrThread.start();

      registerPickFirstLoadBalancer();

      channel = OkHttpChannelBuilder.forAddress("127.0.0.1", port)
        .usePlaintext()
        .maxInboundMessageSize(MAX_INBOUND_GRPC_MESSAGE_SIZE)
        .build();
      blockingStub = AnalyzeProjectServiceGrpc.newBlockingStub(channel);

      waitForStartup();
    } catch (IOException | RuntimeException e) {
      stop();
      throw e;
    }
  }

  private static void registerPickFirstLoadBalancer() {
    if (PICK_FIRST_REGISTERED.compareAndSet(false, true)) {
      LoadBalancerRegistry.getDefaultRegistry().register(new PickFirstLoadBalancerProvider());
    }
  }

  private void waitForStartup() throws IOException {
    if (waitChannelReady(STARTUP_TIMEOUT_MS)) {
      LOG.info("jsts-go gRPC server is ready on port {}", port);
      return;
    }
    throw new IOException(
      "jsts-go gRPC server failed to start within " + STARTUP_TIMEOUT_MS + "ms"
    );
  }

  private boolean waitChannelReady(int timeoutMs) throws IOException {
    if (channel == null) {
      return false;
    }
    long deadlineNanos = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
    ConnectivityState state = channel.getState(true);
    try {
      while (state != ConnectivityState.READY) {
        if (state == ConnectivityState.SHUTDOWN || (process != null && !process.isAlive())) {
          return false;
        }
        long remainingNanos = deadlineNanos - System.nanoTime();
        if (remainingNanos <= 0) {
          return false;
        }
        CountDownLatch latch = new CountDownLatch(1);
        channel.notifyWhenStateChanged(state, latch::countDown);
        boolean stateChanged = latch.await(
          Math.min(TimeUnit.NANOSECONDS.toMillis(remainingNanos), STARTUP_POLL_INTERVAL_MS),
          TimeUnit.MILLISECONDS
        );
        if (stateChanged) {
          state = channel.getState(false);
        }
      }
      return true;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("Interrupted while waiting for jsts-go to start", e);
    }
  }

  @Override
  public void analyzeProject(AnalyzeProjectRequest request, Consumer<Issue> issueConsumer) {
    Iterator<AnalyzeProjectStreamResponse> responses = blockingStub
      .withDeadlineAfter(5, TimeUnit.MINUTES)
      .analyzeProject(request);

    while (responses.hasNext()) {
      AnalyzeProjectStreamResponse response = responses.next();
      switch (response.getMessageCase()) {
        case FILE_RESULT -> handleFileResult(response.getFileResult(), issueConsumer);
        case META -> response
          .getMeta()
          .getWarningsList()
          .forEach(warning -> LOG.warn("[jsts-go] {}", warning));
        case CANCELLED -> LOG.warn("jsts-go analysis was cancelled");
        case MESSAGE_NOT_SET -> {
          // no-op
        }
      }
    }
  }

  private static void handleFileResult(
    FileResultMessage fileResult,
    Consumer<Issue> issueConsumer
  ) {
    for (Issue issue : fileResult.getResult().getIssuesList()) {
      if (issue.getFilePath().isBlank()) {
        issueConsumer.accept(issue.toBuilder().setFilePath(fileResult.getFilePath()).build());
      } else {
        issueConsumer.accept(issue);
      }
    }
  }

  @Override
  public void stop() {
    LOG.info("Stopping jsts-go gRPC server");
    if (channel != null) {
      try {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
      } catch (InterruptedException e) {
        channel.shutdownNow();
        Thread.currentThread().interrupt();
      } finally {
        channel = null;
        blockingStub = null;
      }
    }
    if (process != null && process.isAlive()) {
      process.destroy();
      try {
        if (!process.waitFor(5, TimeUnit.SECONDS)) {
          process.destroyForcibly();
        }
      } catch (InterruptedException e) {
        process.destroyForcibly();
        Thread.currentThread().interrupt();
      }
    }
    process = null;
    port = 0;
  }

  @Override
  public boolean isAlive() {
    return process != null && process.isAlive() && channel != null && !channel.isShutdown();
  }
}
