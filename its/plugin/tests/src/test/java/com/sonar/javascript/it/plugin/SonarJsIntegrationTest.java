/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2012-2023 SonarSource SA
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
package com.sonar.javascript.it.plugin;

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
import java.util.zip.GZIPInputStream;
import org.apache.commons.compress.archivers.ArchiveEntry;
import org.apache.commons.compress.archivers.ArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * This test extracts eslint-bridge archive into tmp directory and starts eslint-bridge using node, then tries to analyze
 * small JS snippet.
 * The goal is to assert http API of eslint-bridge the way it is used by SonarLint in Visual Studio (i.e. without
 * Java plugin).
 * One optimization for SonarLint is, that we don't compute metrics when running under SonarLint.
 */
class SonarJsIntegrationTest {

  @TempDir
  Path temp;

  static Path pluginJar = OrchestratorStarter.JAVASCRIPT_PLUGIN_LOCATION.getFile().toPath();
  static final Gson gson = new Gson();

  @Test
  void test() throws Exception {

    String filename = "sonarjs-1.0.0.tgz";
    EslintBridge eslintBridge = new EslintBridge();
    try (FileSystem fileSystem = FileSystems.newFileSystem(pluginJar, null)) {
      Path fileToExtract = fileSystem.getPath(filename);
      extractArchive(fileToExtract, temp);
      eslintBridge.start(temp);
      assertStatus(eslintBridge);
      eslintBridge.request(gson.toJson(InitLinter.build("sonar-no-unused-vars")), "init-linter");
      assertAnalyzeJs(eslintBridge);
    } finally {
      eslintBridge.stop();
    }
  }

  private void assertAnalyzeJs(EslintBridge eslintBridge) throws IOException, InterruptedException {
    AnalysisRequest r = new AnalysisRequest();
    r.fileContent = "function foo() { \n"
      + "  var a; \n"
      + "  var c; // NOSONAR\n"
      + "  var b = 42; \n"
      + "} \n";
    r.filePath = temp.resolve("file.js").toAbsolutePath().toString();
    String response = eslintBridge.request(gson.toJson(r), "analyze-js");
    JsonObject jsonObject = gson.fromJson(response, JsonObject.class);
    JsonArray issues = jsonObject.getAsJsonArray("issues");
    assertThat(issues).hasSize(3);
    assertThat(issues).extracting(i -> i.getAsJsonObject().get("line").getAsInt()).containsExactlyInAnyOrder(2, 3, 4);
    // this assert makes sure that we don't compute metrics except nosonar lines
    JsonObject metrics = jsonObject.getAsJsonObject("metrics");
    assertThat(metrics.entrySet()).hasSize(1);
    assertThat(metrics.get("nosonarLines").getAsJsonArray()).containsExactly(new JsonPrimitive(3));
  }

  private void assertStatus(EslintBridge eslintBridge) {
    String[] response = new String[1];
    await().atMost(30, SECONDS).until(() -> {
      try {
        response[0] = eslintBridge.status();
        return response[0].equals("OK!");
      } catch (IOException e) {
        Thread.sleep(100);
        return false;
      }
    });
    assertThat(response[0]).isEqualTo("OK!");
  }

  static void extractArchive(Path tgz, Path targetPath) throws IOException {
    try (InputStream stream = new GZIPInputStream(Files.newInputStream(tgz));
         ArchiveInputStream archive = new TarArchiveInputStream(stream)) {
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
      throw new IllegalStateException("Archive entry " + entry.getName() + " is not within " + targetPath);
    }
    return entryPath;
  }


  class EslintBridge {
    int port;
    final HttpClient client;
    private Process process;

    EslintBridge() {
      this.client = HttpClient.newHttpClient();
    }

    void start(Path dest) throws IOException {
      port = findOpenPort();
      String[] cmd = {"node", dest.resolve("package/bin/server").toString(), String.valueOf(port), "127.0.0.1",
        temp.toString(), "true", "true"};
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
  }

  static class InitLinter {
    List<Rule> rules = new ArrayList<>();
    List<String> environments = new ArrayList<>();
    List<String> globals = new ArrayList<>();

    static InitLinter build(String rule) {
      InitLinter initLinter = new InitLinter();
      Rule rule1 = new Rule();
      rule1.key = rule;
      initLinter.rules.add(rule1);
      return initLinter;
    }
  }

  static class Rule {
    String key;
    List<Object> configurations = Collections.emptyList();
    String fileTypeTarget = "MAIN";
  }
}
