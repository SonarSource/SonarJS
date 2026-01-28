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

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import io.grpc.health.v1.HealthCheckRequest;
import io.grpc.health.v1.HealthCheckResponse;
import io.grpc.health.v1.HealthGrpc;
import io.grpc.stub.StreamObserver;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeCssRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeCssResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeHtmlRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeHtmlResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeJsTsRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeJsTsResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectResponse;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeYamlRequest;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeYamlResponse;
import org.sonar.plugins.javascript.bridge.grpc.BridgeServiceGrpc;
import org.sonar.plugins.javascript.bridge.grpc.CancelAnalysisRequest;
import org.sonar.plugins.javascript.bridge.grpc.CancelAnalysisResponse;
import org.sonar.plugins.javascript.bridge.grpc.CloseRequest;
import org.sonar.plugins.javascript.bridge.grpc.CloseResponse;
import org.sonar.plugins.javascript.bridge.grpc.InitLinterRequest;
import org.sonar.plugins.javascript.bridge.grpc.InitLinterResponse;

/**
 * gRPC client for communicating with the Node.js bridge server.
 * Replaces the HTTP-based communication with efficient binary protocol.
 */
public class BridgeGrpcClient implements AutoCloseable {

  private static final Logger LOG = LoggerFactory.getLogger(BridgeGrpcClient.class);
  private static final int MAX_MESSAGE_SIZE = 100 * 1024 * 1024; // 100MB
  private static final String BRIDGE_SERVICE_NAME = "bridge.BridgeService";
  private static final int DEFAULT_TIMEOUT_SECONDS = 300; // 5 minutes default

  private final ManagedChannel channel;
  private final BridgeServiceGrpc.BridgeServiceBlockingStub blockingStub;
  private final BridgeServiceGrpc.BridgeServiceStub asyncStub;
  private final HealthGrpc.HealthBlockingStub healthStub;
  private final int timeoutSeconds;

  /**
   * Creates a new gRPC client connecting to the specified host and port with default timeout.
   *
   * @param host the hostname of the bridge server
   * @param port the port number of the bridge server
   */
  public BridgeGrpcClient(String host, int port) {
    this(host, port, DEFAULT_TIMEOUT_SECONDS);
  }

  /**
   * Creates a new gRPC client connecting to the specified host and port with custom timeout.
   *
   * @param host the hostname of the bridge server
   * @param port the port number of the bridge server
   * @param timeoutSeconds timeout in seconds for RPC calls
   */
  public BridgeGrpcClient(String host, int port, int timeoutSeconds) {
    this.channel = ManagedChannelBuilder.forAddress(host, port)
      .usePlaintext()
      .maxInboundMessageSize(MAX_MESSAGE_SIZE)
      .build();
    this.blockingStub = BridgeServiceGrpc.newBlockingStub(channel);
    this.asyncStub = BridgeServiceGrpc.newStub(channel);
    this.healthStub = HealthGrpc.newBlockingStub(channel);
    this.timeoutSeconds = timeoutSeconds;
  }

  /**
   * Gets a blocking stub with the configured deadline.
   */
  private BridgeServiceGrpc.BridgeServiceBlockingStub getStubWithDeadline() {
    return blockingStub.withDeadlineAfter(timeoutSeconds, TimeUnit.SECONDS);
  }

  /**
   * Waits for the gRPC server to become available.
   *
   * @param timeoutMs maximum time to wait in milliseconds
   * @return true if server is ready, false if timeout exceeded
   */
  public boolean waitForReady(long timeoutMs) {
    long startTime = System.currentTimeMillis();
    long sleepStep = 100;

    while (System.currentTimeMillis() - startTime < timeoutMs) {
      if (isHealthy()) {
        return true;
      }
      try {
        Thread.sleep(sleepStep);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return false;
      }
    }
    return false;
  }

  /**
   * Checks if the gRPC server is healthy and serving requests.
   *
   * @return true if server is healthy
   */
  public boolean isHealthy() {
    try {
      HealthCheckRequest request = HealthCheckRequest.newBuilder()
        .setService(BRIDGE_SERVICE_NAME)
        .build();
      HealthCheckResponse response = healthStub.check(request);
      return response.getStatus() == HealthCheckResponse.ServingStatus.SERVING;
    } catch (StatusRuntimeException e) {
      LOG.trace("Health check failed: {}", e.getMessage());
      return false;
    }
  }

  /**
   * Initializes the linter with the specified configuration.
   *
   * @param request the initialization request
   * @return the initialization response
   * @throws StatusRuntimeException if the RPC fails
   */
  public InitLinterResponse initLinter(InitLinterRequest request) {
    LOG.debug("InitLinter: initializing with {} rules", request.getRulesCount());
    return getStubWithDeadline().initLinter(request);
  }

  /**
   * Analyzes a JavaScript/TypeScript file.
   *
   * @param request the analysis request
   * @return the analysis response
   * @throws StatusRuntimeException if the RPC fails
   */
  public AnalyzeJsTsResponse analyzeJsTs(AnalyzeJsTsRequest request) {
    LOG.debug("AnalyzeJsTs: {}", request.getFilePath());
    return getStubWithDeadline().analyzeJsTs(request);
  }

  /**
   * Analyzes a CSS file.
   *
   * @param request the analysis request
   * @return the analysis response
   * @throws StatusRuntimeException if the RPC fails
   */
  public AnalyzeCssResponse analyzeCss(AnalyzeCssRequest request) {
    LOG.debug("AnalyzeCss: {}", request.getFilePath());
    return getStubWithDeadline().analyzeCss(request);
  }

  /**
   * Analyzes a YAML file with embedded JavaScript.
   *
   * @param request the analysis request
   * @return the analysis response
   * @throws StatusRuntimeException if the RPC fails
   */
  public AnalyzeYamlResponse analyzeYaml(AnalyzeYamlRequest request) {
    LOG.debug("AnalyzeYaml: {}", request.getFilePath());
    return getStubWithDeadline().analyzeYaml(request);
  }

  /**
   * Analyzes an HTML file with embedded JavaScript.
   *
   * @param request the analysis request
   * @return the analysis response
   * @throws StatusRuntimeException if the RPC fails
   */
  public AnalyzeHtmlResponse analyzeHtml(AnalyzeHtmlRequest request) {
    LOG.debug("AnalyzeHtml: {}", request.getFilePath());
    return getStubWithDeadline().analyzeHtml(request);
  }

  /**
   * Analyzes an entire project using server-streaming RPC.
   * Results are streamed back to the provided consumer.
   * Note: Project analysis uses a longer timeout since it processes multiple files.
   *
   * @param request the project analysis request
   * @param responseConsumer callback to process each streaming response
   * @throws StatusRuntimeException if the RPC fails
   */
  public void analyzeProject(
    AnalyzeProjectRequest request,
    Consumer<AnalyzeProjectResponse> responseConsumer
  ) {
    LOG.debug("AnalyzeProject: starting analysis of {} files", request.getFilesCount());
    // Use longer deadline for project analysis (10x the normal timeout, minimum 1 hour)
    long projectTimeoutSeconds = Math.max(timeoutSeconds * 10L, 3600L);
    Iterator<AnalyzeProjectResponse> responses = blockingStub
      .withDeadlineAfter(projectTimeoutSeconds, TimeUnit.SECONDS)
      .analyzeProject(request);
    while (responses.hasNext()) {
      responseConsumer.accept(responses.next());
    }
    LOG.debug("AnalyzeProject: completed");
  }

  /**
   * Cancels any ongoing analysis.
   *
   * @return the cancel response
   * @throws StatusRuntimeException if the RPC fails
   */
  public CancelAnalysisResponse cancelAnalysis() {
    LOG.debug("CancelAnalysis: cancelling ongoing analysis");
    return getStubWithDeadline().cancelAnalysis(CancelAnalysisRequest.getDefaultInstance());
  }

  /**
   * Requests the server to shut down gracefully.
   *
   * @return the close response
   * @throws StatusRuntimeException if the RPC fails
   */
  public CloseResponse requestClose() {
    LOG.debug("Close: requesting server shutdown");
    return getStubWithDeadline().close(CloseRequest.getDefaultInstance());
  }

  /**
   * Shuts down the gRPC channel.
   */
  @Override
  public void close() {
    try {
      channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      LOG.warn("Interrupted while shutting down gRPC channel", e);
      channel.shutdownNow();
      Thread.currentThread().interrupt();
    }
  }

  /**
   * Gets the underlying channel for testing purposes.
   */
  ManagedChannel getChannel() {
    return channel;
  }
}
