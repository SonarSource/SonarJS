/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2025 SonarSource SA
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
package com.sonar.javascript.it.plugin;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * This test extracts the bridge archive into tmp directory and starts the bridge using node, then tries to analyze
 * small JS snippet.
 * The goal is to assert http API of the bridge the way it is used by SonarLint in Visual Studio (i.e. without
 * Java plugin).
 * One optimization for SonarLint is, that we don't compute metrics when running under SonarLint.
 */
class SonarJsIntegrationTest {

  @TempDir
  Path temp;

  static Path pluginJar;

  static {
    try {
      pluginJar = Path.of(OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION.getURL().toURI());
    } catch (URISyntaxException e) {
      throw new IllegalStateException(e);
    }
  }

  static final Gson gson = new Gson();

  @Test
  void test() throws Exception {
    String filename = "sonarjs-1.0.0.tgz";
    Bridge bridge = new Bridge();
    try (FileSystem fileSystem = FileSystems.newFileSystem(pluginJar, Map.of())) {
      Path fileToExtract = fileSystem.getPath(filename);
      extractArchive(fileToExtract, temp);
      bridge.start(temp);
      assertStatus(bridge);
      bridge.request(
        gson.toJson(InitLinter.build("S1481", temp.toAbsolutePath().toString())),
        "init-linter"
      );
      assertAnalyzeJs(bridge);
    } finally {
      bridge.stop();
    }
  }

  private void assertAnalyzeJs(Bridge bridge) throws IOException, InterruptedException {
    AnalysisRequest r = new AnalysisRequest();
    r.fileContent = "function foo() { \n  var a; \n  var c; // NOSONAR\n  var b = 42; \n} \n";
    r.filePath = temp.resolve("file.js").toAbsolutePath().toString();
    String response = bridge.request(gson.toJson(r), "analyze-jsts");
    JsonObject jsonObject = gson.fromJson(response, JsonObject.class);
    JsonArray issues = jsonObject.getAsJsonArray("issues");
    assertThat(issues).hasSize(3);
    assertThat(issues)
      .extracting(i -> i.getAsJsonObject().get("line").getAsInt())
      .containsExactlyInAnyOrder(2, 3, 4);
    // this assert makes sure that we don't compute metrics except nosonar lines
    JsonObject metrics = jsonObject.getAsJsonObject("metrics");
    assertThat(metrics.entrySet()).hasSize(1);
    assertThat(metrics.get("nosonarLines").getAsJsonArray()).containsExactly(new JsonPrimitive(3));
  }

  private void assertStatus(Bridge bridge) {
    String[] response = new String[1];
    await()
      .atMost(30, SECONDS)
      .until(() -> {
        try {
          response[0] = bridge.status();
          return response[0].equals("OK");
        } catch (IOException e) {
          Thread.sleep(100);
          return false;
        }
      });
    assertThat(response[0]).isEqualTo("OK");
  }

  static void extractArchive(Path tgz, Path targetPath) throws IOException {
    try (
      InputStream stream = new GZIPInputStream(Files.newInputStream(tgz));
      ArchiveInputStream archive = new TarArchiveInputStream(stream)
    ) {
      ArchiveEntry entry;
      while ((entry = archive.getNextEntry()) != null) {
        if (!archive.canReadEntryData(entry)) {
          throw new IllegalStateException("Failed to extract bundle");
        }
        Path entryFile = entryPath(targetPath, entry);
        if (entry.isDirectory()) {
          Files.createDirectories(entryFile);
        } else {
          Path parent = entryFile.getParent();
          Files.createDirectories(parent);
          try (OutputStream os = Files.newOutputStream(entryFile)) {
            IOUtils.copy(archive, os);
          }
        }
      }
    }
  }

  private static Path entryPath(Path targetPath, ArchiveEntry entry) {
    Path entryPath = targetPath.resolve(entry.getName()).normalize();
    if (!entryPath.startsWith(targetPath)) {
      throw new IllegalStateException(
        "Archive entry " + entry.getName() + " is not within " + targetPath
      );
    }
    return entryPath;
  }

  class Bridge {

    int port;
    final HttpClient client;
    private Process process;

    Bridge() {
      this.client = HttpClient.newBuilder().build();
    }

    void start(Path dest) throws IOException {
      port = findOpenPort();
      String[] cmd = {
        "node",
        dest.resolve("package/bin/server.cjs").toString(),
        String.valueOf(port),
        "127.0.0.1",
      };
      ProcessBuilder pb = new ProcessBuilder(cmd);
      pb.inheritIO();
      process = pb.start();
    }

    String request(String json, String endpoint) throws IOException, InterruptedException {
      var request = HttpRequest.newBuilder(url(endpoint))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json))
        .build();

      var response = client.send(request, HttpResponse.BodyHandlers.ofString());
      return response.body();
    }

    String status() throws IOException, InterruptedException {
      var request = HttpRequest.newBuilder(url("status")).GET().build();
      return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
    }

    private URI url(String endpoint) {
      try {
        return new URI("http", null, "127.0.0.1", port, "/" + endpoint, null, null);
      } catch (URISyntaxException e) {
        throw new IllegalStateException(e);
      }
    }

    int findOpenPort() throws IOException {
      try (ServerSocket socket = new ServerSocket(0)) {
        return socket.getLocalPort();
      }
    }

    void stop() {
      process.destroyForcibly();
    }
  }

  static class AnalysisRequest {

    String filePath;
    String fileContent;
    String fileType = "MAIN";
    boolean sonarlint = true;
    boolean skipAst = true;
  }

  static class InitLinter {

    List<Rule> rules = new ArrayList<>();
    List<String> environments = new ArrayList<>();
    List<String> globals = new ArrayList<>();
    String baseDir;

    static InitLinter build(String rule, String baseDir) {
      InitLinter initLinter = new InitLinter();
      Rule rule1 = new Rule();
      rule1.key = rule;
      initLinter.rules.add(rule1);
      initLinter.baseDir = baseDir;
      return initLinter;
    }
  }

  static class Rule {

    String key;
    List<Object> configurations = Collections.emptyList();
    List<String> analysisModes = Collections.singletonList("DEFAULT");
    List<String> fileTypeTargets = Collections.singletonList("MAIN");
    String language = "js";
  }
}
