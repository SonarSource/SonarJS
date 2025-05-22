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
import java.net.URI;
import java.util.concurrent.BlockingQueue;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class JSWebSocketClientImpl extends WebSocketClient implements JSWebSocketClient {

  private static final Logger LOG = LoggerFactory.getLogger(JSWebSocketClientImpl.class);
  private BlockingQueue<String> queue;

  JSWebSocketClientImpl(URI uri) {
    super(uri);
  }

  @Override
  public void onOpen(ServerHandshake handshakedata) {
    LOG.debug("Connected to WebSocket server: {}", uri);
  }

  @Override
  public void onMessage(String message) {
    this.queue.add(message);
  }

  @Override
  public void onClose(int code, String reason, boolean remote) {
    LOG.debug("Connection closed: {}", reason);
    if (queue != null) {
      queue.add(CONNECTION_CLOSED);
    }
  }

  @Override
  public void onError(Exception ex) {
    LOG.error("Error: " + ex.getMessage(), ex);
    if (queue != null) {
      queue.add(CONNECTION_ERROR);
    }
  }

  @Override
  public void setQueue(BlockingQueue<String> queue) {
    this.queue = queue;
  }
}
