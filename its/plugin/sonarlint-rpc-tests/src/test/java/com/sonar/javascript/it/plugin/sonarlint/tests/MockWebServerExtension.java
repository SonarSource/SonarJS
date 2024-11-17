/*
 * SonarLint Language Server
 * Copyright (C) 2009-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package com.sonar.javascript.it.plugin.sonarlint.tests;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.fail;

import com.google.protobuf.Message;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import mockwebserver3.Dispatcher;
import mockwebserver3.MockResponse;
import mockwebserver3.MockWebServer;
import mockwebserver3.RecordedRequest;
import okio.Buffer;
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

public class MockWebServerExtension implements BeforeEachCallback, AfterEachCallback {

  private final Integer port;
  private MockWebServer server;
  protected final Map<String, MockResponse> responsesByPath = new HashMap<>();

  public MockWebServerExtension() {
    this.server = new MockWebServer();
    this.port = null;
  }

  public MockWebServerExtension(int port) {
    this.server = new MockWebServer();
    this.port = port;
  }

  @Override
  public void beforeEach(ExtensionContext context) throws Exception {
    server = new MockWebServer();
    responsesByPath.clear();
    final Dispatcher dispatcher = new Dispatcher() {
      @Override
      public MockResponse dispatch(RecordedRequest request) {
        if (responsesByPath.containsKey(request.getPath())) {
          return responsesByPath.get(request.getPath());
        }
        return new MockResponse().setResponseCode(404);
      }
    };
    server.setDispatcher(dispatcher);
    if (this.port != null) {
      server.start(this.port);
    } else {
      server.start();
    }
  }

  @Override
  public void afterEach(ExtensionContext context) throws Exception {
    stopServer();
  }

  public void stopServer() throws IOException {
    server.shutdown();
  }

  public void addStringResponse(String path, String body) {
    responsesByPath.put(path, new MockResponse().setBody(body));
  }

  public void removeResponse(String path) {
    responsesByPath.remove(path);
  }

  public void addResponse(String path, MockResponse response) {
    responsesByPath.put(path, response);
  }

  public int getRequestCount() {
    return server.getRequestCount();
  }

  public RecordedRequest takeRequest() {
    try {
      return server.takeRequest();
    } catch (InterruptedException e) {
      fail(e);
      return null; // appeasing the compiler: this line will never be executed.
    }
  }

  public String url(String path) {
    return server.url(path).toString();
  }

  public void addResponseFromResource(String path, String responseResourcePath) {
    try (var b = new Buffer()) {
      responsesByPath.put(path, new MockResponse().setBody(b.readFrom(requireNonNull(MockWebServerExtension.class.getResourceAsStream(responseResourcePath)))));
    } catch (IOException e) {
      fail(e);
    }
  }

  public void addProtobufResponse(String path, Message m) {
    try (var b = new Buffer()) {
      m.writeTo(b.outputStream());
      responsesByPath.put(path, new MockResponse().setBody(b));
    } catch (IOException e) {
      fail(e);
    }
  }

  public void addProtobufResponseDelimited(String path, Message... m) {
    try (var b = new Buffer()) {
      writeMessages(b.outputStream(), Arrays.asList(m).iterator());
      responsesByPath.put(path, new MockResponse().setBody(b));
    }
  }

  public static <T extends Message> void writeMessages(OutputStream output, Iterator<T> messages) {
    while (messages.hasNext()) {
      writeMessage(output, messages.next());
    }
  }

  public static <T extends Message> void writeMessage(OutputStream output, T message) {
    try {
      message.writeDelimitedTo(output);
    } catch (IOException e) {
      throw new IllegalStateException("failed to write message: " + message, e);
    }
  }

}
