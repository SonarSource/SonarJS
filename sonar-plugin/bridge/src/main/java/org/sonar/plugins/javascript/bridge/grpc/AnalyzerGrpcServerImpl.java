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
package org.sonar.plugins.javascript.bridge.grpc;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.NetUtils;
import org.sonar.plugins.javascript.bridge.TsgolintIssueConverter;

@ScannerSide
public class AnalyzerGrpcServerImpl implements AnalyzerGrpcServer {

  private static final Logger LOG = LoggerFactory.getLogger(AnalyzerGrpcServerImpl.class);
  private static final int STARTUP_TIMEOUT_MS = 10_000;
  private static final int STARTUP_POLL_INTERVAL_MS = 200;

  private final Path binaryPath;
  private Process process;
  private ManagedChannel channel;
  private AnalyzerServiceGrpc.AnalyzerServiceBlockingStub blockingStub;
  private int port;

  public AnalyzerGrpcServerImpl(Path binaryPath) {
    this.binaryPath = binaryPath;
  }

  @Override
  public void start() throws IOException {
    port = NetUtils.findOpenPort();
    LOG.info("Starting tsgolint gRPC server on port {}", port);

    ProcessBuilder pb = new ProcessBuilder(binaryPath.toString(), "--port", String.valueOf(port));
    pb.redirectErrorStream(false);
    process = pb.start();

    // Log stderr in background thread
    var stderr = new BufferedReader(new InputStreamReader(process.getErrorStream()));
    Thread stderrThread = new Thread(
      () -> {
        try {
          String line;
          while ((line = stderr.readLine()) != null) {
            LOG.info("[tsgolint] {}", line);
          }
        } catch (IOException e) {
          LOG.debug("tsgolint stderr reader stopped", e);
        }
      },
      "tsgolint-stderr"
    );
    stderrThread.setDaemon(true);
    stderrThread.start();

    // Create gRPC channel
    channel = ManagedChannelBuilder.forAddress("localhost", port).usePlaintext().build();
    blockingStub = AnalyzerServiceGrpc.newBlockingStub(channel);

    // Poll until alive
    waitForStartup();
  }

  private void waitForStartup() throws IOException {
    long deadline = System.currentTimeMillis() + STARTUP_TIMEOUT_MS;
    while (System.currentTimeMillis() < deadline) {
      try {
        if (isAlive()) {
          LOG.info("tsgolint gRPC server is ready on port {}", port);
          return;
        }
      } catch (Exception e) {
        // expected during startup
      }
      try {
        Thread.sleep(STARTUP_POLL_INTERVAL_MS);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new IOException("Interrupted while waiting for tsgolint to start", e);
      }
    }
    throw new IOException(
      "tsgolint gRPC server failed to start within " + STARTUP_TIMEOUT_MS + "ms"
    );
  }

  @Override
  public void analyzeProject(
    AnalyzeProjectRequest request,
    Consumer<BridgeServer.Issue> issueConsumer
  ) {
    Iterator<AnalyzeProjectResponse> responses = blockingStub
      .withDeadlineAfter(5, TimeUnit.MINUTES)
      .analyzeProject(request);

    while (responses.hasNext()) {
      AnalyzeProjectResponse response = responses.next();
      if (response.hasFileResult()) {
        FileResult fileResult = response.getFileResult();
        for (Issue protoIssue : fileResult.getIssuesList()) {
          issueConsumer.accept(
            TsgolintIssueConverter.convert(protoIssue, fileResult.getFilePath())
          );
        }
      } else if (response.hasComplete()) {
        AnalysisComplete complete = response.getComplete();
        for (String warning : complete.getWarningsList()) {
          LOG.warn("[tsgolint] {}", warning);
        }
      }
    }
  }

  @Override
  public boolean isAlive() {
    try {
      AliveResponse resp = blockingStub
        .withDeadlineAfter(5, TimeUnit.SECONDS)
        .isAlive(AliveRequest.getDefaultInstance());
      return "ok".equals(resp.getStatus());
    } catch (Exception e) {
      return false;
    }
  }

  @Override
  public void stop() {
    LOG.info("Stopping tsgolint gRPC server");
    if (channel != null) {
      try {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
      } catch (InterruptedException e) {
        channel.shutdownNow();
        Thread.currentThread().interrupt();
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
  }
}
