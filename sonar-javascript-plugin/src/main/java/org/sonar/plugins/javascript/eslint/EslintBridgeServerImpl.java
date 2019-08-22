/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
package org.sonar.plugins.javascript.eslint;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;
import okhttp3.HttpUrl;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonarsource.nodejs.BundleUtils;
import org.sonarsource.nodejs.NodeCommand;
import org.sonarsource.nodejs.NodeCommandBuilder;
import org.sonarsource.nodejs.NodeCommandException;

import static org.sonar.plugins.javascript.eslint.NetUtils.findOpenPort;
import static org.sonar.plugins.javascript.eslint.NetUtils.waitServerToStart;

public class EslintBridgeServerImpl implements EslintBridgeServer {

  private static final Logger LOG = Loggers.get(EslintBridgeServerImpl.class);

  private static final int DEFAULT_TIMEOUT_SECONDS = 10;
  private static final String DEFAULT_STARTUP_SCRIPT = "node_modules/eslint-bridge/bin/server";
  private static final String DEPLOY_LOCATION = "eslint-bridge-bundle";
  private static final Gson GSON = new Gson();

  // this archive is created in eslint-bridge/scripts/package.js
  private static final String BUNDLE_LOCATION = "/eslint-bridge.tar.xz";

  private final OkHttpClient client;
  private final NodeCommandBuilder nodeCommandBuilder;
  private final int timeoutSeconds;
  private int port;
  private NodeCommand nodeCommand;
  private String startServerScript;
  private String bundleLocation;
  private Path deployLocation;
  private boolean failedToStart;

  // Used by pico container for dependency injection
  @SuppressWarnings("unused")
  public EslintBridgeServerImpl(NodeCommandBuilder nodeCommandBuilder, TempFolder tempFolder) {
    this(nodeCommandBuilder, tempFolder, DEFAULT_TIMEOUT_SECONDS, DEFAULT_STARTUP_SCRIPT, BUNDLE_LOCATION);
  }

  EslintBridgeServerImpl(
    NodeCommandBuilder nodeCommandBuilder, TempFolder tempFolder, int timeoutSeconds,
    String startServerScript,
    String bundleLocation
  ) {
    this.nodeCommandBuilder = nodeCommandBuilder;
    this.timeoutSeconds = timeoutSeconds;
    this.startServerScript = startServerScript;
    this.client = new OkHttpClient.Builder()
      .callTimeout(Duration.ofSeconds(timeoutSeconds))
      .build();
    this.deployLocation = tempFolder.newDir(DEPLOY_LOCATION).toPath();
    this.bundleLocation = bundleLocation;
  }

  void deploy() throws IOException {
    long start = System.currentTimeMillis();
    LOG.debug("Deploying eslint-bridge into {}", deployLocation);
    InputStream bundle = getClass().getResourceAsStream(bundleLocation);
    if (bundle == null) {
      throw new IllegalStateException("eslint-bridge not found in plugin jar");
    }
    BundleUtils.extractFromClasspath(bundle, deployLocation);
    LOG.debug("Deployment done in {}ms", System.currentTimeMillis() - start);
  }

  void startServer(SensorContext context) throws IOException, NodeCommandException {
    port = findOpenPort();

    File scriptFile = deployLocation.resolve(startServerScript).toFile();
    if (!scriptFile.exists()) {
      throw new NodeCommandException("Node.js script to start eslint-bridge server doesn't exist: " + scriptFile.getAbsolutePath());
    }

    initNodeCommand(context, scriptFile);

    LOG.debug("Starting Node.js process to start eslint-bridge server at port " + port);
    nodeCommand.start();

    if (!waitServerToStart("localhost", port, timeoutSeconds * 1000)) {
      throw new NodeCommandException("Failed to start server (" + timeoutSeconds + "s timeout)");
    }
    LOG.debug("Server is started");
  }

  private void initNodeCommand(SensorContext context, File scriptFile) {
    nodeCommand = nodeCommandBuilder
      .outputConsumer(message -> {
        if (message.startsWith("DEBUG")) {
          LOG.debug(message.substring(5).trim());
        } else {
          LOG.info(message);
        }
      })
      .minNodeVersion(6)
      .configuration(context.config())
      .script(scriptFile.getAbsolutePath())
      .scriptArgs(String.valueOf(port))
      .build();
  }

  @Override
  public void startServerLazily(SensorContext context) throws IOException, ServerAlreadyFailedException, NodeCommandException {
    // required for SonarLint context to avoid restarting already failed server
    if (failedToStart) {
      throw new ServerAlreadyFailedException();
    }

    try {
      if (isAlive()) {
        LOG.debug("SonarJS eslint-bridge server is up, no need to start.");
        return;
      }
      deploy();
      startServer(context);
    } catch (NodeCommandException e) {
      failedToStart = true;
      throw e;
    }
  }

  @Override
  public AnalysisResponse call(AnalysisRequest request) throws IOException {
    String json = GSON.toJson(request);
    return response(request(json, "analyze"));
  }

  @Override
  public AnalysisResponse analyzeTypeScript(TypeScriptAnalysisRequest request) throws IOException {
    String json = GSON.toJson(request);
    return response(request(json, "analyze-ts"));
  }

  private String request(String json, String endpoint) throws IOException {
    HttpUrl url = new HttpUrl.Builder()
      .scheme("http")
      .host("localhost")
      .port(port)
      .addPathSegment(endpoint)
      .build();
    Request request = new Request.Builder()
      .url(url)
      .post(RequestBody.create(MediaType.get("application/json"), json))
      .build();

    try (Response response = client.newCall(request).execute()) {
      // in this case response.body() is never null (according to docs)
      return response.body().string();
    }
  }

  private static AnalysisResponse response(String result) {
    try {
      return GSON.fromJson(result, AnalysisResponse.class);
    } catch (JsonSyntaxException e) {
      LOG.error("Failed to parse: \n-----\n" + result + "\n-----\n");
      return new AnalysisResponse();
    }
  }


  boolean isAlive() {
    if (nodeCommand == null) {
      return false;
    }
    Request request = new Request.Builder()
      .url("http://localhost:" + port + "/status")
      .get()
      .build();

    try (Response response = client.newCall(request).execute()) {
      String body = response.body().string();
      // in this case response.body() is never null (according to docs)
      return "OK!".equals(body);
    } catch (IOException e) {
      LOG.error("Error requesting server status. Server is probably dead.", e);
      return false;
    }
  }

  @Override
  public void clean() {
    if (nodeCommand != null) {
      nodeCommand.destroy();
      nodeCommand = null;
    }
  }

  @Override
  public String getCommandInfo() {
    if (nodeCommand == null) {
      return "Node.js command to start eslint-bridge server was not built yet.";
    } else {
      return "Node.js command to start eslint-bridge was: " + nodeCommand.toString();
    }
  }

  @Override
  public void start() {
    // Server is started lazily from the org.sonar.plugins.javascript.eslint.EslintBasedRulesSensor
  }

  @Override
  public void stop() {
    clean();
  }
}
