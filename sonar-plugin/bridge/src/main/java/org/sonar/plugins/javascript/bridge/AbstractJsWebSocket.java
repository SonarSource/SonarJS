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

import com.google.gson.Gson;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public abstract class AbstractJsWebSocket implements JSWebSocketClient {

  static final Gson GSON = new Gson();

  protected AnalyzeProjectHandler handler = null;
  CompletableFuture<List<BridgeServer.Issue>> handle = null;

  public CompletableFuture<List<BridgeServer.Issue>> analyzeProject(
    BridgeServer.ProjectAnalysisRequest request,
    AnalyzeProjectHandler handler
  ) throws IOException {
    this.handler = handler;
    handle = new CompletableFuture<>();
    this.handler.setFutureHandle(handle);
    this.send(GSON.toJson(request));
    return handle;
  }
}
