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

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Legacy in-process message dispatcher kept for existing tests and handler behavior.
 * Runtime transport now uses gRPC (no WebSocket connection is established).
 */
public class JSWebSocketClient {

  private static final Logger LOG = LoggerFactory.getLogger(JSWebSocketClient.class);
  private static final Gson GSON = new Gson();

  // We need to use CopyOnWriteArrayList as we modify the array while iterating over it
  private final List<WebSocketMessageHandler<?>> messageHandlers = new CopyOnWriteArrayList<>();
  private final URI uri;

  public JSWebSocketClient(URI serverUri) {
    this.uri = serverUri;
  }

  public void registerHandler(WebSocketMessageHandler<?> handler) {
    messageHandlers.add(handler);
    handler
      .getFuture()
      .whenComplete((result, exception) -> {
        messageHandlers.remove(handler);
        if (exception != null) {
          LOG.error("Error in handler execution", exception);
        }
      });
  }

  public List<WebSocketMessageHandler<?>> getMessageHandlers() {
    return messageHandlers;
  }

  public void send(String message) {
    LOG.trace("Sending message: {}", message);
  }

  public void onMessage(String message) {
    LOG.trace("Received message: {}", message);
    JsonObject jsonObject = JsonParser.parseString(message).getAsJsonObject();

    if ("error".equals(jsonObject.get("messageType").getAsString())) {
      handleError(jsonObject.get("error").getAsJsonObject().toString());
      return;
    }

    for (WebSocketMessageHandler<?> handler : messageHandlers) {
      handler.handleMessage(jsonObject);
      if (handler.getContext().isCancelled()) {
        this.send(GSON.toJson(Map.of("type", "on-cancel-analysis")));
      }
    }
  }

  private void handleError(String message) {
    var errorMessage = String.format("Received error from bridge: %s", message);
    for (WebSocketMessageHandler<?> handler : messageHandlers) {
      handler.getFuture().completeExceptionally(new RuntimeException(errorMessage));
    }
  }

  public void onClose(int code, String reason, boolean remote) {
    LOG.debug("Connection closed: {} (code: {}) on {}", reason, code, uri);
    for (WebSocketMessageHandler<?> handler : messageHandlers) {
      handler.onClose(code, reason, remote);
    }
  }

  public void onError(Exception e) {
    LOG.error("Connection error occurred", e);
    for (WebSocketMessageHandler<?> handler : messageHandlers) {
      handler.onError(e);
    }
  }
}
