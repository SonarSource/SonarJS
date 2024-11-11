/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.bridge;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import javax.annotation.Nullable;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.util.Timeout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

interface Http {

  static Http getInstance() {
    return new JdkHttp();
  }

  Response post(String json, URI uri, long timeoutSeconds) throws IOException;

  String get(URI uri) throws IOException;

  record Response(String contentType, byte[] body) {}

  class JdkHttp implements Http {

    private static final Logger LOG = LoggerFactory.getLogger(JdkHttp.class);
    private final HttpClient client;

    JdkHttp() {
      this.client =
        HttpClient.newBuilder().build();
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
          .orElseThrow(() -> new IllegalStateException("No Content-Type header"));
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

  class ApacheHttp implements Http {

    @Override
    public Response post(String json, URI uri, long timeoutSeconds) throws IOException {
      try (var httpclient = HttpClients.createDefault()) {

        var config = RequestConfig.custom()
          .setResponseTimeout(Timeout.ofSeconds(timeoutSeconds))
          .build();

        HttpPost httpPost = new HttpPost(uri);
        httpPost.setEntity(new StringEntity(json, ContentType.APPLICATION_JSON));
        httpPost.setConfig(config);

        return httpclient.execute(httpPost, response -> {
          var contentTypeHeader = response.getHeader("Content-Type");
          return new Response(contentTypeHeader.toString(), EntityUtils.toByteArray(response.getEntity()));
        });
      }
    }

    private static boolean isFormData(@Nullable Header contentTypeHeader) {
      if (contentTypeHeader == null) {
        return false;
      }
      return contentTypeHeader.toString().contains("multipart/form-data");
    }

    public String get(URI uri) throws IOException{
      try (var client = HttpClients.custom().build()) {
        var get = new HttpGet(uri);
        return client.execute(get, response -> EntityUtils.toString(response.getEntity()));
      }
    }
  }
}
