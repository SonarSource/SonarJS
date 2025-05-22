package org.sonar.plugins.javascript.bridge;

import java.util.concurrent.BlockingQueue;
import javax.annotation.Nullable;

public interface JSWebSocketClient {
  void send(@Nullable String message);
  void setQueue(BlockingQueue<String> queue);
}
