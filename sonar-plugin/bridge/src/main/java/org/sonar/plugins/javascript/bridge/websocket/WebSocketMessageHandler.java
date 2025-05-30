package org.sonar.plugins.javascript.bridge.websocket;

import com.google.gson.JsonObject;
import java.util.concurrent.CompletableFuture;
import org.sonar.plugins.javascript.bridge.BridgeServer.Request;

/**
 * Interface for handling WebSocket messages in a flexible WebSocket client architecture.
 * Implementations of this interface can provide specialized handling for different
 * types of WebSocket messages.
 */
public interface WebSocketMessageHandler {
  /**
   * Get the JSON request that needs to be sent to the server
   *
   * @return A BridgeServer.Request object
   */
  Request getRequest();

  /**
   * Get the JSON request that needs to be sent to the server
   *
   * @return A BridgeServer.Request object
   */
  CompletableFuture<?> getFuture();

  /**
   * Handles a text WebSocket message.
   *
   * @param message the WebSocket text message to handle
   * @return true if the message has been consumed and no other handlers should be called, false otherwise
   */
  boolean handleMessage(JsonObject message);

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
