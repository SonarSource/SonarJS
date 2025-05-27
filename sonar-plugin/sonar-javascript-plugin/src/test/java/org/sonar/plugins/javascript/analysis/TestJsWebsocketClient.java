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
