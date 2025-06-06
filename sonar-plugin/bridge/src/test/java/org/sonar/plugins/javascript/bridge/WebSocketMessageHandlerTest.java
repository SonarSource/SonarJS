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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.google.gson.JsonObject;
import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sonar.api.batch.sensor.internal.SensorContextTester;

class WebSocketMessageHandlerTest {

  @TempDir
  Path baseDir;

  SensorContextTester ctx = SensorContextTester.create(baseDir);

  @Test
  void testDefaultMethods() {
    var handler = new WebSocketMessageHandler<Void>() {
      @Override
      public Void getRequest() {
        return null;
      }

      @Override
      public CompletableFuture<Void> getFuture() {
        return null;
      }

      @Override
      public void handleMessage(JsonObject message) {}

      @Override
      public SensorContextTester getContext() {
        return ctx;
      }
    };
    // The default implementation should not throw exceptions
    assertDoesNotThrow(() -> handler.onClose(1000, "Normal closure", true));
    // The default implementation should not throw exceptions
    Exception testException = new RuntimeException("Test exception");
    assertDoesNotThrow(() -> handler.onError(testException));
  }

  @Test
  void testOverriddenOnCloseMethod() {
    // Create an implementation that overrides onClose
    StringBuilder log = new StringBuilder();
    var handler = new WebSocketMessageHandler<Void>() {
      @Override
      public Void getRequest() {
        return null;
      }

      @Override
      public CompletableFuture<Void> getFuture() {
        return null;
      }

      @Override
      public void handleMessage(JsonObject message) {}

      @Override
      public void onClose(int code, String reason, boolean remote) {
        log.append("Closed: ").append(code).append(" - ").append(reason);
      }

      @Override
      public SensorContextTester getContext() {
        return ctx;
      }
    };

    // Call the overridden method
    handler.onClose(1001, "Going away", false);

    // Verify the overridden behavior
    assertEquals("Closed: 1001 - Going away", log.toString());
  }

  @Test
  void testOverriddenOnErrorMethod() {
    // Create an implementation that overrides onError
    StringBuilder log = new StringBuilder();
    var handler = new WebSocketMessageHandler<Void>() {
      @Override
      public Void getRequest() {
        return null;
      }

      @Override
      public CompletableFuture<Void> getFuture() {
        return null;
      }

      @Override
      public void handleMessage(JsonObject message) {}

      @Override
      public void onError(Exception exception) {
        log.append("Error: ").append(exception.getMessage());
      }

      @Override
      public SensorContextTester getContext() {
        return ctx;
      }
    };

    // Call the overridden method
    Exception testException = new RuntimeException("Test exception");
    handler.onError(testException);

    // Verify the overridden behavior
    assertEquals("Error: Test exception", log.toString());
  }
}
