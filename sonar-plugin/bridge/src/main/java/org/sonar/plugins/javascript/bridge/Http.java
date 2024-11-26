/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public interface Http {

  static Http getJdkHttpClient() {
    return new JdkHttp();
  }

  Response post(String json, URI uri, long timeoutSeconds) throws IOException;

  String get(URI uri) throws IOException;

  record Response(@Nullable String contentType, byte[] body) {}

  class JdkHttp implements Http {

    private static final Logger LOG = LoggerFactory.getLogger(JdkHttp.class);
    private final HttpClient client;

    JdkHttp() {
      this.client = HttpClient.newBuilder().build();
    }

    @Override
    public Response post(String json, URI uri, long timeoutSeconds) throws IOException {
      var request = HttpRequest
        .newBuilder()
        .uri(uri)
        .timeout(Duration.ofSeconds(timeoutSeconds))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json))
        .build();

      try {
        var response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
        var contentType = response.headers().firstValue("Content-Type")
          .orElse(null);
        return new Response(contentType, response.body());
      } catch (InterruptedException e) {
        throw handleInterruptedException(e, "Request " + uri + " was interrupted.");
      }
    }

    @Override
    public String get(URI uri) throws IOException{
      var request = HttpRequest.newBuilder(uri).GET().build();
      try {
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
      } catch (InterruptedException e) {
        throw handleInterruptedException(e, "isAlive was interrupted");
      }
    }

    private static IllegalStateException handleInterruptedException(
      InterruptedException e,
      String msg
    ) {
      LOG.error(msg, e);
      Thread.currentThread().interrupt();
      return new IllegalStateException(msg, e);
    }

  }

}
