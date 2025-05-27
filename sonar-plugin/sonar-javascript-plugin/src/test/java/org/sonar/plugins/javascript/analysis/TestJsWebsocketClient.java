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
package org.sonar.plugins.javascript.analysis;

import java.io.IOException;
import java.util.List;
import org.jetbrains.annotations.Nullable;
import org.sonar.plugins.javascript.bridge.AbstractJsWebSocket;

public class TestJsWebsocketClient extends AbstractJsWebSocket {

  private final List<String> mockedMessages;

  public TestJsWebsocketClient(List<String> mockedMessages) {
    this.mockedMessages = mockedMessages;
  }

  @Override
  public void onMessage(String message) throws IOException {
    this.handler.processMessage(message);
  }

  @Override
  public void send(String message) throws IOException {
    for (String mockedMessage : mockedMessages) {
      onMessage(mockedMessage);
    }
  }
}
