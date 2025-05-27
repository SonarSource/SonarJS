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

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import javax.annotation.Nullable;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JSWebSocketClientImpl extends AbstractJsWebSocket {

  private static final Logger LOG = LoggerFactory.getLogger(JSWebSocketClientImpl.class);
  private final WebSocketClient socket;

  CompletableFuture<List<BridgeServer.Issue>> handle;
  AnalyzeProjectHandler handler;

  JSWebSocketClientImpl(URI uri) throws InterruptedException {
    this.socket = new WebSocketClient(uri) {
      @Override
      public void onOpen(ServerHandshake handshakedata) {
        LOG.debug("Connected to WebSocket server: {}", uri);
      }

      @Override
      public void onMessage(String message) {
        if (CONNECTION_CLOSED.equals(message) || CONNECTION_ERROR.equals(message)) {
          LOG.info("Analysis closed with message: {}", message);
          handle.completeExceptionally(new IllegalStateException(message));
        }
        try {
          LOG.info("Received message: {}", message);
          handler.processMessage(message);
        } catch (IOException e) {
          handle.completeExceptionally(new IllegalStateException(e));
        }
      }

      @Override
      public void onClose(int code, String reason, boolean remote) {
        LOG.debug("Connection closed: {}", reason);
      }

      @Override
      public void onError(Exception ex) {
        LOG.error("Error: " + ex.getMessage(), ex);
      }
    };
    // Wait for connection to establish
    LOG.debug("Established WebSocket connection");
    this.socket.connectBlocking();
  }

  @Override
  public void send(String message) throws IOException {
    socket.send(message);
  }

  @Override
  public void onMessage(String message) {
    socket.send(message);
  }
}
