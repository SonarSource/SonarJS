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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectResponse;

/**
 * Handles streaming responses from project analysis via gRPC.
 * Replaces the WebSocket-based WebSocketMessageHandler.
 */
public class GrpcProjectAnalysisHandler implements Consumer<AnalyzeProjectResponse> {

  private static final Logger LOG = LoggerFactory.getLogger(GrpcProjectAnalysisHandler.class);

  private final Map<String, BridgeServer.AnalysisResponse> fileResults;
  private final List<String> warnings;
  private final CompletableFuture<Void> completionFuture;
  private volatile boolean cancelled;
  private volatile String errorMessage;

  public GrpcProjectAnalysisHandler() {
    this.fileResults = new ConcurrentHashMap<>();
    this.warnings = Collections.synchronizedList(new ArrayList<>());
    this.completionFuture = new CompletableFuture<>();
    this.cancelled = false;
    this.errorMessage = null;
  }

  @Override
  public void accept(AnalyzeProjectResponse response) {
    switch (response.getResultCase()) {
      case FILE_RESULT -> handleFileResult(response);
      case META -> handleMeta(response);
      case CANCELLED -> handleCancelled();
      case ERROR -> handleError(response);
      case RESULT_NOT_SET -> LOG.warn("Received empty response from project analysis");
    }
  }

  private void handleFileResult(AnalyzeProjectResponse response) {
    var fileResult = response.getFileResult();
    String filename = fileResult.getFilename();
    LOG.debug("Received analysis result for file: {}", filename);

    BridgeServer.AnalysisResponse analysisResponse = BridgeResponseConverter.fromFileAnalysisResult(
      fileResult
    );

    fileResults.put(filename, analysisResponse);
  }

  private void handleMeta(AnalyzeProjectResponse response) {
    var meta = response.getMeta();
    LOG.debug("Received meta with {} warnings", meta.getWarningsCount());
    warnings.addAll(meta.getWarningsList());
    // Meta with warnings is the final message, complete the future
    completionFuture.complete(null);
  }

  private void handleCancelled() {
    LOG.info("Project analysis was cancelled");
    this.cancelled = true;
    completionFuture.complete(null);
  }

  private void handleError(AnalyzeProjectResponse response) {
    var error = response.getError();
    LOG.error("Project analysis error: {} - {}", error.getCode(), error.getMessage());
    this.errorMessage = error.getMessage();
    completionFuture.completeExceptionally(
      new RuntimeException("Project analysis failed: " + error.getMessage())
    );
  }

  /**
   * Gets the future that completes when analysis is done.
   */
  public CompletableFuture<Void> getFuture() {
    return completionFuture;
  }

  /**
   * Gets the collected file results.
   */
  public Map<String, BridgeServer.AnalysisResponse> getFileResults() {
    return Collections.unmodifiableMap(fileResults);
  }

  /**
   * Gets the mutable file results map. For testing purposes.
   */
  public Map<String, BridgeServer.AnalysisResponse> getFileResultsInternal() {
    return fileResults;
  }

  /**
   * Gets the collected warnings.
   */
  public List<String> getWarnings() {
    return Collections.unmodifiableList(warnings);
  }

  /**
   * Gets the mutable warnings list. For testing purposes.
   */
  public List<String> getWarningsInternal() {
    return warnings;
  }

  /**
   * Checks if analysis was cancelled.
   */
  public boolean isCancelled() {
    return cancelled;
  }

  /**
   * Gets the error message if analysis failed.
   */
  public String getErrorMessage() {
    return errorMessage;
  }
}
