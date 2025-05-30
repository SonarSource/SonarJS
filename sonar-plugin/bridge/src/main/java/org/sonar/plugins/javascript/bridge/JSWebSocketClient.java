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

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.net.URI;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.plugins.javascript.bridge.websocket.WebSocketMessageHandler;

public class JSWebSocketClient extends WebSocketClient {

  private static final Logger LOG = LoggerFactory.getLogger(JSWebSocketClient.class);
  private final List<WebSocketMessageHandler> messageHandlers = new CopyOnWriteArrayList<>();

  public JSWebSocketClient(URI serverUri) {
    super(serverUri);
  }

  public void registerHandler(WebSocketMessageHandler handler) {
    messageHandlers.add(handler);
  }

  public void unregisterHandler(WebSocketMessageHandler handler) {
    messageHandlers.remove(handler);
  }

  @Override
  public void onOpen(ServerHandshake handshakedata) {
    LOG.debug("WebSocket connection opened: {}", uri);
  }

  @Override
  public void onMessage(String message) {
    LOG.debug("Received WebSocket message: {}", message);
    JsonObject jsonObject = JsonParser.parseString(message).getAsJsonObject();
    for (WebSocketMessageHandler handler : messageHandlers) {
      if (handler.handleMessage(jsonObject)) {
        return;
      }
    }
  }

  @Override
  public void onClose(int code, String reason, boolean remote) {
    LOG.debug("WebSocket connection closed: {} (code: {})", reason, code);
    for (WebSocketMessageHandler handler : messageHandlers) {
      handler.onClose(code, reason, remote);
    }
  }

  @Override
  public void onError(Exception e) {
    LOG.error("WebSocket error occurred", e);
    for (WebSocketMessageHandler handler : messageHandlers) {
      handler.onError(e);
    }
  }
}
