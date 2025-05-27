package org.sonar.plugins.javascript.bridge;

import com.google.gson.Gson;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public abstract class AbstractJsWebSocket implements JSWebSocketClient {

  protected AnalyzeProjectHandler handler = null;
  CompletableFuture<List<BridgeServer.Issue>> handle = null;
  static final Gson GSON = new Gson();

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
