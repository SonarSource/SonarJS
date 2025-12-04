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

import com.google.gson.JsonObject;
import java.util.concurrent.CompletableFuture;

/**
 * Interface for handling WebSocket messages in a flexible WebSocket client architecture.
 * Implementations of this interface can provide specialized handling for different
 * types of WebSocket messages.
 */
public interface WebSocketMessageHandler<T> {
  /**
   * Get the request that needs to be sent to the server
   */
  T getRequest();

  /**
   * Get the internal Completable future
   */
  CompletableFuture<Void> getFuture();

  /**
   * Handles a JSON WebSocket message.
   *
   * @param message the parsed JSON object
   */
  void handleMessage(JsonObject message);

  /**
   * Called when the WebSocket connection is closed.
   * Implementations can use this to clean up resources.
   *
   * @param code   the status code
   * @param reason the reason for closing
   * @param remote whether the connection was closed by the remote endpoint
   */
  default void onClose(int code, String reason, boolean remote) {
    // Default empty implementation
  }

  /**
   * Called when an error occurs in the WebSocket connection.
   *
   * @param exception the exception that occurred
   */
  default void onError(Exception exception) {
    // Default empty implementation
  }
}
