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

import java.util.concurrent.CompletableFuture;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectStreamResponse;

/**
 * Application-level handler for streamed project-analysis requests and responses.
 */
public interface ProjectAnalysisHandler {
  /**
   * Get the request that needs to be sent to the server.
   */
  AnalyzeProjectRequest getRequest();

  /**
   * Get the Context of the Sensor owning the handler.
   */
  SensorContext getContext();

  /**
   * Get the internal Completable future.
   */
  CompletableFuture<Void> getFuture();

  /**
   * Handles a streamed protobuf response from the analyzer runtime.
   */
  void handleMessage(AnalyzeProjectStreamResponse message);
}
